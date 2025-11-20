import { create } from 'zustand';
import { Workout, Interval } from './types';
import { useBluetoothStore } from '../bluetooth/BluetoothManager';

interface WorkoutStoreState {
    isActive: boolean;
    isPaused: boolean;
    currentWorkout: Workout | null;
    activeIntervalIndex: number;
    elapsedTime: number;
    intervalElapsedTime: number;
    lastCoachFeedback: string | null;

    startWorkout: (workout: Workout) => void;
    pauseWorkout: () => void;
    resumeWorkout: () => void;
    stopWorkout: () => void;
    tick: () => void;
    skipInterval: () => void;
}

export const useWorkoutStore = create<WorkoutStoreState>((set, get) => ({
    isActive: false,
    isPaused: false,
    currentWorkout: null,
    activeIntervalIndex: 0,
    elapsedTime: 0,
    intervalElapsedTime: 0,
    lastCoachFeedback: null,

    startWorkout: (workout: Workout) => {
        set({
            isActive: true,
            isPaused: false,
            currentWorkout: workout,
            activeIntervalIndex: 0,
            elapsedTime: 0,
            intervalElapsedTime: 0,
            lastCoachFeedback: null,
        });

        // Set initial resistance
        const firstInterval = workout.intervals[0];
        if (firstInterval) {
            useBluetoothStore.getState().setTargetPower(firstInterval.targetPower);
        }
    },

    pauseWorkout: () => set({ isPaused: true }),

    resumeWorkout: () => set({ isPaused: false }),

    stopWorkout: () => {
        set({
            isActive: false,
            isPaused: false,
            currentWorkout: null,
            activeIntervalIndex: 0,
            elapsedTime: 0,
            intervalElapsedTime: 0,
        });
        // Reset resistance or stop?
        useBluetoothStore.getState().setTargetPower(100); // Default fallback
    },

    tick: () => {
        const { isActive, isPaused, currentWorkout, activeIntervalIndex, intervalElapsedTime, elapsedTime } = get();

        if (!isActive || isPaused || !currentWorkout) return;

        const currentInterval = currentWorkout.intervals[activeIntervalIndex];

        if (!currentInterval) {
            get().stopWorkout();
            return;
        }

        // Check if interval is complete
        if (intervalElapsedTime >= currentInterval.duration) {
            // Trigger AI Analysis for the completed interval
            const { power, heartRate, cadence } = useBluetoothStore.getState();
            // Note: In a real app, we'd calculate averages over the interval.
            // Here we just use the current instantaneous values as a proxy for simplicity.

            fetch('/api/coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'analysis',
                    data: {
                        targetPower: currentInterval.targetPower,
                        actualPower: power || 0,
                        heartRate: heartRate || 0,
                        cadence: cadence || 0,
                    }
                })
            }).then(res => res.json()).then(feedback => {
                if (feedback.message) {
                    set({ lastCoachFeedback: feedback.message });
                    // Speak the feedback (Text-to-Speech)
                    const utterance = new SpeechSynthesisUtterance(feedback.message);
                    window.speechSynthesis.speak(utterance);
                }
            }).catch(err => console.error('Coach API failed', err));

            // Move to next interval
            const nextIndex = activeIntervalIndex + 1;

            if (nextIndex < currentWorkout.intervals.length) {
                const nextInterval = currentWorkout.intervals[nextIndex];
                set({
                    activeIntervalIndex: nextIndex,
                    intervalElapsedTime: 0,
                    elapsedTime: elapsedTime + 1,
                });
                // Set new resistance
                useBluetoothStore.getState().setTargetPower(nextInterval.targetPower);
            } else {
                // Workout complete
                get().stopWorkout();
            }
        } else {
            // Continue interval
            set({
                elapsedTime: elapsedTime + 1,
                intervalElapsedTime: intervalElapsedTime + 1,
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
