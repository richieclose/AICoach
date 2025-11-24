import React from 'react';
import { Heart } from 'lucide-react';

interface HeartRateZoneBarProps {
    currentHr: number;
    maxHr: number;
}

export function HeartRateZoneBar({ currentHr, maxHr }: HeartRateZoneBarProps) {
    const percentage = Math.min(100, Math.max(0, (currentHr / maxHr) * 100));

    // Determine current zone
    let zone = 0;
    let color = 'bg-gray-500';
    let label = 'Rest';

    if (percentage < 60) {
        zone = 1;
        color = 'bg-gray-400';
        label = 'Z1 Recovery';
    } else if (percentage < 70) {
        zone = 2;
        color = 'bg-blue-500';
        label = 'Z2 Endurance';
    } else if (percentage < 80) {
        zone = 3;
        color = 'bg-green-500';
        label = 'Z3 Tempo';
    } else if (percentage < 90) {
        zone = 4;
        color = 'bg-orange-500';
        label = 'Z4 Threshold';
    } else {
        zone = 5;
        color = 'bg-red-500';
        label = 'Z5 Anaerobic';
    }

    return (
        <div className="w-full space-y-2">
            <div className="flex justify-between items-end">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span>{currentHr} BPM</span>
                    <span className="text-xs opacity-50">({Math.round(percentage)}%)</span>
                </div>
                <div className={`text-xs font-bold px-2 py-1 rounded-full ${color} bg-opacity-20 text-white`}>
                    {label}
                </div>
            </div>

            {/* Zone Bar */}
            <div className="h-3 bg-secondary/20 rounded-full overflow-hidden relative flex">
                {/* Zone Markers (Background) */}
                <div className="h-full bg-gray-400/20 w-[60%]" title="Z1" />
                <div className="h-full bg-blue-500/20 w-[10%]" title="Z2" />
                <div className="h-full bg-green-500/20 w-[10%]" title="Z3" />
                <div className="h-full bg-orange-500/20 w-[10%]" title="Z4" />
                <div className="h-full bg-red-500/20 w-[10%]" title="Z5" />

                {/* Current Position Indicator */}
                <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-500 ease-out"
                    style={{ left: `${percentage}%` }}
                />
            </div>

            <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
                <span className="w-[60%] text-center border-r border-white/5">Z1</span>
                <span className="w-[10%] text-center border-r border-white/5">Z2</span>
                <span className="w-[10%] text-center border-r border-white/5">Z3</span>
                <span className="w-[10%] text-center border-r border-white/5">Z4</span>
                <span className="w-[10%] text-center">Z5</span>
            </div>
        </div>
    );
}
