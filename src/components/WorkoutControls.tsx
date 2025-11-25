'use client';

import React, { useRef } from 'react';
import { useWorkoutStore } from '@/lib/workout/workoutStore';
import { useUserStore } from '@/lib/user/userStore';
import { useMusicStore } from '@/store/musicStore';
import { Play, Pause, Square, SkipForward, Upload } from 'lucide-react';
import { parseZwo } from '@/lib/workout/zwoParser';

export function WorkoutControls() {
    const { isActive, isPaused, startWorkout, pauseWorkout, resumeWorkout, stopWorkout, skipInterval } = useWorkoutStore();
    const { ftp } = useUserStore();
    const { startPlaylist } = useMusicStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            try {
                const workout = parseZwo(content, ftp);
                startWorkout(workout);
                // Auto-start music if playlist exists
                setTimeout(() => startPlaylist(), 500);
            } catch (error) {
                console.error("Failed to parse ZWO:", error);
                alert("Invalid ZWO file");
            }
        };
        reader.readAsText(file);
    };

    if (!isActive) {
        return (
            <div className="flex gap-4">
                <button
                    onClick={() => {
                        // Start a default workout for testing if no file
                        startWorkout({
                            id: 'test-1',
                            name: 'Test Workout',
                            description: 'A simple test workout',
                            totalDuration: 1800,
                            intervals: [
                                { id: '1', duration: 300, targetPower: 150, type: 'warmup', description: 'Warmup' },
                                { id: '2', duration: 600, targetPower: 200, type: 'active', description: 'Steady State' },
                                { id: '3', duration: 300, targetPower: 150, type: 'recovery', description: 'Recovery' },
                                { id: '4', duration: 600, targetPower: 220, type: 'active', description: 'Push It' },
                            ]
                        });
                        // Auto-start music if playlist exists
                        setTimeout(() => startPlaylist(), 500);
                    }}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-full text-lg font-bold transition-all hover:scale-105 shadow-lg shadow-primary/25"
                >
                    <Play className="w-6 h-6 fill-current" />
                    Start Default Workout
                </button>


            </div>
        );
    }

    return (
        <div className="flex items-center gap-6 bg-card/50 backdrop-blur-sm p-4 rounded-2xl border border-white/10 shadow-2xl animate-in slide-in-from-bottom-4">
            {isPaused ? (
                <button
                    onClick={resumeWorkout}
                    className="p-4 bg-green-500 hover:bg-green-600 text-white rounded-full transition-all hover:scale-110 shadow-lg"
                >
                    <Play className="w-8 h-8 fill-current" />
                </button>
            ) : (
                <button
                    onClick={pauseWorkout}
                    className="p-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full transition-all hover:scale-110 shadow-lg"
                >
                    <Pause className="w-8 h-8 fill-current" />
                </button>
            )}

            <button
                onClick={stopWorkout}
                className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all hover:scale-110 shadow-lg"
            >
                <Square className="w-8 h-8 fill-current" />
            </button>

            <div className="w-px h-12 bg-white/10" />

            <button
                onClick={skipInterval}
                className="flex items-center gap-2 px-6 py-3 bg-secondary/20 hover:bg-secondary/30 text-secondary rounded-xl font-medium transition-colors"
            >
                <SkipForward className="w-5 h-5" />
                Skip Interval
            </button>
        </div>
    );
}
