export type IntervalType = 'warmup' | 'active' | 'recovery' | 'cooldown';

export interface Interval {
    id: string;
    duration: number; // seconds
    targetPower: number; // watts
    type: IntervalType;
    description?: string;
    cadenceTarget?: number; // optional RPM target
}

export interface Workout {
    id: string;
    name: string;
    description?: string;
    intervals: Interval[];
    totalDuration: number; // seconds
}

export interface WorkoutState {
    isActive: boolean;
    isPaused: boolean;
    currentWorkout: Workout | null;
    activeIntervalIndex: number;
    elapsedTime: number; // Total workout time
    intervalElapsedTime: number; // Time in current interval
}
