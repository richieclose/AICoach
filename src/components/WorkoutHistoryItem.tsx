import React from 'react';
import { Calendar, Clock, Zap, Activity, TrendingUp } from 'lucide-react';

interface WorkoutHistoryItemProps {
    workout: {
        id: string;
        name: string;
        startTime: Date;
        duration: number;
        normalizedPower: number | null;
        trainingStressScore: number | null;
        intensityFactor: number | null;
        averagePower: number | null;
    };
}

export function WorkoutHistoryItem({ workout }: WorkoutHistoryItemProps) {
    const date = new Date(workout.startTime).toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    return (
        <div className="bg-card/50 border border-white/5 rounded-xl p-4 hover:bg-card/80 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Calendar className="w-3 h-3" />
                    {date}
                </div>
                <h3 className="font-bold text-lg">{workout.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(workout.duration)}
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 w-full md:w-auto">
                <div className="flex flex-col items-center p-2 bg-secondary/5 rounded-lg min-w-[80px]">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">NP</span>
                    <div className="flex items-center gap-1 font-bold text-lg text-yellow-400">
                        <Zap className="w-3 h-3" />
                        {workout.normalizedPower || '-'}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Watts</span>
                </div>

                <div className="flex flex-col items-center p-2 bg-secondary/5 rounded-lg min-w-[80px]">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">TSS</span>
                    <div className="flex items-center gap-1 font-bold text-lg text-blue-400">
                        <Activity className="w-3 h-3" />
                        {workout.trainingStressScore || '-'}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Score</span>
                </div>

                <div className="flex flex-col items-center p-2 bg-secondary/5 rounded-lg min-w-[80px]">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">IF</span>
                    <div className="flex items-center gap-1 font-bold text-lg text-green-400">
                        <TrendingUp className="w-3 h-3" />
                        {workout.intensityFactor?.toFixed(2) || '-'}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Factor</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-secondary/5 rounded-lg min-w-[80px]">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg</span>
                    <div className="flex items-center gap-1 font-bold text-lg text-white">
                        <Zap className="w-3 h-3" />
                        {workout.averagePower || '-'}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Watts</span>
                </div>
            </div>
        </div>
    );
}
