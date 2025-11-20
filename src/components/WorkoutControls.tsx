'use client';

import React from 'react';
import { useWorkoutStore } from '@/lib/workout/workoutStore';
import { Workout } from '@/lib/workout/types';
import { Play, Pause, Square, SkipForward } from 'lucide-react';

const TEST_WORKOUT: Workout = {
    id: 'test-1',
    name: 'FTP Builder - Test',
    totalDuration: 600,
    intervals: [
        { id: '1', duration: 60, targetPower: 100, type: 'warmup', description: 'Warmup' },
        { id: '2', duration: 30, targetPower: 200, type: 'active', description: 'Hard Push!' },
        { id: '3', duration: 30, targetPower: 100, type: 'recovery', description: 'Easy Spin' },
        { id: '4', duration: 30, targetPower: 250, type: 'active', description: 'Harder!' },
        { id: '5', duration: 60, targetPower: 100, type: 'cooldown', description: 'Cooldown' },
    ]
};

export function WorkoutControls() {
    const { isActive, isPaused, startWorkout, pauseWorkout, resumeWorkout, stopWorkout, skipInterval } = useWorkoutStore();

    if (!isActive) {
        return (
            <button
                onClick={() => startWorkout(TEST_WORKOUT)}
                className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-4 rounded-2xl text-lg font-bold shadow-xl shadow-accent/20 transition-all transform hover:scale-105"
            >
                <Play className="w-6 h-6 fill-current" />
                Start Test Workout
            </button>
        );
    }

    return (
        <div className="flex items-center gap-4">
            {isPaused ? (
                <button
                    onClick={resumeWorkout}
                    className="p-4 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors shadow-lg"
                >
                    <Play className="w-8 h-8 fill-current" />
                </button>
            ) : (
                <button
                    onClick={pauseWorkout}
                    className="p-4 rounded-full bg-yellow-500 text-white hover:bg-yellow-600 transition-colors shadow-lg"
                >
                    <Pause className="w-8 h-8 fill-current" />
                </button>
            )}

            <button
                onClick={stopWorkout}
                className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg"
            >
                <Square className="w-8 h-8 fill-current" />
            </button>

            <button
                onClick={skipInterval}
                className="p-4 rounded-full bg-slate-700 text-white hover:bg-slate-600 transition-colors shadow-lg"
            >
                <SkipForward className="w-8 h-8" />
            </button>
        </div>
    );
}
