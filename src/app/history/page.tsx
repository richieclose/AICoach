'use client';

import React, { useState } from 'react';
import { getWorkouts } from '@/app/actions/workout';
import { WorkoutHistoryItem } from '@/components/WorkoutHistoryItem';
import { ArrowLeft, History, Upload } from 'lucide-react';
import Link from 'next/link';
import { TCXImportModal } from '@/components/TCXImportModal';

export default function HistoryPage() {
    const [workouts, setWorkouts] = useState<any[]>([]);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    React.useEffect(() => {
        loadWorkouts();
    }, []);

    const loadWorkouts = async () => {
        setIsLoading(true);
        const data = await getWorkouts();
        setWorkouts(data);
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <div className="flex items-center gap-2">
                            <History className="w-6 h-6 text-primary" />
                            <h1 className="text-2xl font-bold">Workout History</h1>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-colors"
                    >
                        <Upload className="w-4 h-4" />
                        Import TCX
                    </button>
                </div>

                {/* List */}
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>Loading...</p>
                        </div>
                    ) : workouts.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground bg-card/30 rounded-2xl border border-white/5">
                            <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p className="text-lg font-medium">No workouts recorded yet.</p>
                            <p className="text-sm opacity-70">Complete your first ride or import TCX files to see them here!</p>
                        </div>
                    ) : (
                        workouts.map((workout: any) => (
                            <WorkoutHistoryItem key={workout.id} workout={workout} />
                        ))
                    )}
                </div>
            </div>

            <TCXImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImportComplete={loadWorkouts}
            />
        </div>
    );
}
