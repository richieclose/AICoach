import { create } from 'zustand';
import { Workout, Interval } from './types';
import { useBluetoothStore } from '../bluetooth/BluetoothManager';
import { useUserStore } from '../user/userStore';
import { generateTCX } from './tcxGenerator';

interface WorkoutStoreState {
    isActive: boolean;
    isPaused: boolean;
    isPending: boolean; // New state: waiting for power
    pendingModification: { type: 'power' | 'duration'; value: number; reason: string } | null;
    currentWorkout: Workout | null;
    activeIntervalIndex: number;
    elapsedTime: number;
    intervalElapsedTime: number;
    lastCoachFeedback: string | null;
    lastFeedbackTime: number;

    startWorkout: (workout: Workout) => void;
    pauseWorkout: () => void;
    resumeWorkout: () => void;
    stopWorkout: () => void;
    tick: () => void;
    skipInterval: () => void;
    applyModification: () => void;
    rejectModification: () => void;
    recordedData: WorkoutDataPoint[];
    clearData: () => void;
}

export interface WorkoutDataPoint {
    timestamp: number;
    power: number;
    heartRate: number;
    cadence: number;
}

export const useWorkoutStore = create<WorkoutStoreState>((set, get) => ({
    isActive: false,
    isPaused: false,
    isPending: false,
    pendingModification: null,
    currentWorkout: null,
    activeIntervalIndex: 0,
    elapsedTime: 0,
    intervalElapsedTime: 0,
    lastCoachFeedback: null,
    lastFeedbackTime: 0,
    recordedData: [],

    applyModification: () => {
        const { pendingModification, currentWorkout, activeIntervalIndex } = get();
        if (!pendingModification || !currentWorkout) return;

        const { type, value } = pendingModification;
        const newIntervals = [...currentWorkout.intervals];

        if (type === 'power') {
            // Apply power change to current and all future intervals
            // We don't want to change warmup/cooldown if we are in active set, but for simplicity let's just shift all future intervals
            // or maybe just the "active" ones? Let's apply to all remaining intervals for now to be effective.
            for (let i = activeIntervalIndex; i < newIntervals.length; i++) {
                // Ensure we don't go below 0
                newIntervals[i] = {
                    ...newIntervals[i],
                    targetPower: Math.max(0, newIntervals[i].targetPower + value)
                };
            }

            // Update immediately if we are in the active interval
            const currentInterval = newIntervals[activeIntervalIndex];
            useBluetoothStore.getState().setTargetPower(currentInterval.targetPower);

        } else if (type === 'duration') {
            // Apply duration change to current interval only (extend/shorten)
            if (newIntervals[activeIntervalIndex]) {
                newIntervals[activeIntervalIndex] = {
                    ...newIntervals[activeIntervalIndex],
                    duration: Math.max(10, newIntervals[activeIntervalIndex].duration + value) // Min 10s
                };
            }
        }

        set({
            currentWorkout: { ...currentWorkout, intervals: newIntervals },
            pendingModification: null
        });

        // Feedback
        const utterance = new SpeechSynthesisUtterance(value > 0 ? "Increasing intensity." : "Reducing intensity.");
        window.speechSynthesis.speak(utterance);
    },

    rejectModification: () => {
        set({ pendingModification: null });
    },

    clearData: () => set({ recordedData: [] }),

    startWorkout: (workout: Workout) => {
        set({
            isActive: true,
            isPaused: false,
            isPending: true, // Start in pending state
            currentWorkout: workout,
            activeIntervalIndex: 0,
            elapsedTime: 0,
            intervalElapsedTime: 0,
            lastCoachFeedback: null,
            lastFeedbackTime: 0,
            recordedData: [],
        });

        // Set initial resistance immediately so they feel it when they start
        if (workout.intervals && workout.intervals.length > 0) {
            const firstInterval = workout.intervals[0];
            useBluetoothStore.getState().setTargetPower(firstInterval.targetPower);
        }
    },

    pauseWorkout: () => set({ isPaused: true }),

    resumeWorkout: () => set({ isPaused: false }),

    stopWorkout: () => {
        const { currentWorkout, recordedData } = get();

        // Generate and download TCX if we have data
        if (currentWorkout && recordedData.length > 0) {
            // Save to Database
            const startTime = Date.now() - (get().elapsedTime * 1000); // Approximate start time
            const endTime = Date.now();

            // We need to import saveWorkout dynamically or use it from props/context if it was a component, 
            // but here we are in a store. We can import the server action directly in Next.js 14+.
            // However, we need to handle the async nature.
            import('../../app/actions/workout').then(({ saveWorkout }) => {
                saveWorkout(currentWorkout.name, startTime, endTime, recordedData, currentWorkout)
                    .then(() => console.log('Workout saved to database'))
                    .catch(err => console.error('Failed to save workout to DB:', err));
            });

            try {
                const tcxContent = generateTCX(currentWorkout.name, recordedData);
                const blob = new Blob([tcxContent], { type: 'application/vnd.garmin.tcx+xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `workout-${new Date().toISOString().split('T')[0]}.tcx`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Failed to save TCX file:', error);
            }
        }

        set({
            isActive: false,
            isPaused: false,
            isPending: false,
            currentWorkout: null,
            activeIntervalIndex: 0,
            elapsedTime: 0,
            intervalElapsedTime: 0,
        });
        useBluetoothStore.getState().setTargetPower(100);
    },

    tick: () => {
        const { isActive, isPaused, isPending, currentWorkout, activeIntervalIndex, intervalElapsedTime, elapsedTime, recordedData } = get();

        if (!isActive || isPaused || !currentWorkout || !currentWorkout.intervals) return;

        const { power, heartRate, cadence } = useBluetoothStore.getState();

        // Check for start condition
        if (isPending) {
            if (power && power > 10) {
                // User started pedaling!
                set({ isPending: false });
                // Speak start message?
                const utterance = new SpeechSynthesisUtterance("Workout started. Let's go!");
                window.speechSynthesis.speak(utterance);
            } else {
                // Still waiting
                return;
            }
        }

        // Record Data
        const newDataPoint: WorkoutDataPoint = {
            timestamp: Date.now(),
            power: power || 0,
            heartRate: heartRate || 0,
            cadence: cadence || 0,
        };

        const currentInterval = currentWorkout.intervals[activeIntervalIndex];

        if (!currentInterval) {
            get().stopWorkout();
            return;
        }

        // Check if interval is complete
        if (intervalElapsedTime >= currentInterval.duration) {
            // Move to next interval
            const nextIndex = activeIntervalIndex + 1;

            if (nextIndex < currentWorkout.intervals.length) {
                const nextInterval = currentWorkout.intervals[nextIndex];
                set({
                    activeIntervalIndex: nextIndex,
                    intervalElapsedTime: 0,
                    elapsedTime: elapsedTime + 1,
                    recordedData: [...recordedData, newDataPoint],
                    lastFeedbackTime: 0, // Reset feedback timer for new interval
                });
                // Set new resistance
                useBluetoothStore.getState().setTargetPower(nextInterval.targetPower);
            } else {
                // Workout complete
                get().stopWorkout();
            }
        } else {
            // Continue interval
            const { lastFeedbackTime } = get();
            let newLastFeedbackTime = lastFeedbackTime;

            // Trigger Feedback every 60 seconds (if enough data exists)
            // We use intervalElapsedTime to ensure we don't trigger immediately at start of interval if we don't want to
            // But user asked for "last 90 seconds", so we can use global time or interval time.
            // Let's use global time check: Date.now() - lastFeedbackTime > 60000
            const now = Date.now();
            if (now - lastFeedbackTime > 60000 && recordedData.length > 30) { // Wait for at least 30s of data
                newLastFeedbackTime = now;

                // Get last 60 seconds of data
                const recentPoints = recordedData.slice(-60);
                const avgPower = Math.round(recentPoints.reduce((a, b) => a + b.power, 0) / recentPoints.length);
                const avgHR = Math.round(recentPoints.reduce((a, b) => a + b.heartRate, 0) / recentPoints.length);
                const avgCadence = Math.round(recentPoints.reduce((a, b) => a + b.cadence, 0) / recentPoints.length);

                // Call API
                fetch('/api/coach', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'feedback',
                        data: {
                            intervalDescription: currentInterval.description,
                            targetPower: currentInterval.targetPower,
                            recentData: { avgPower, avgHR, avgCadence },
                            userName: useUserStore.getState().name
                        }
                    })
                }).then(res => res.json()).then(data => {
                    if (data.message) {
                        set({
                            lastCoachFeedback: data.message,
                            pendingModification: data.modification || null
                        });
                        // Speak
                        const utterance = new SpeechSynthesisUtterance(data.message);
                        window.speechSynthesis.speak(utterance);
                    }
                }).catch(err => console.error('Feedback API failed', err));
            }

            set({
                elapsedTime: elapsedTime + 1,
                intervalElapsedTime: intervalElapsedTime + 1,
                recordedData: [...recordedData, newDataPoint],
                lastFeedbackTime: newLastFeedbackTime > lastFeedbackTime ? newLastFeedbackTime : lastFeedbackTime
            });
        }
    },

    skipInterval: () => {
        const { currentWorkout, activeIntervalIndex, elapsedTime } = get();
        if (!currentWorkout) return;

        const nextIndex = activeIntervalIndex + 1;
        if (nextIndex < currentWorkout.intervals.length) {
            const nextInterval = currentWorkout.intervals[nextIndex];
            set({
                activeIntervalIndex: nextIndex,
                intervalElapsedTime: 0,
                // We don't jump elapsed time, just interval index
            });
            useBluetoothStore.getState().setTargetPower(nextInterval.targetPower);
        } else {
            get().stopWorkout();
        }
    }
}));
