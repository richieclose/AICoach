import React from 'react';
import { Zap } from 'lucide-react';

interface PowerZoneBarProps {
    currentPower: number;
    ftp: number;
}

export function PowerZoneBar({ currentPower, ftp }: PowerZoneBarProps) {
    // Avoid division by zero
    const safeFtp = ftp > 0 ? ftp : 200;
    const percentage = Math.min(150, Math.max(0, (currentPower / safeFtp) * 100));

    // Determine current zone (Coggan Zones)
    let zone = 0;
    let color = 'bg-gray-500';
    let label = 'Rest';

    if (percentage < 55) {
        zone = 1;
        color = 'bg-gray-400';
        label = 'Z1 Recovery';
    } else if (percentage < 75) {
        zone = 2;
        color = 'bg-blue-500';
        label = 'Z2 Endurance';
    } else if (percentage < 90) {
        zone = 3;
        color = 'bg-green-500';
        label = 'Z3 Tempo';
    } else if (percentage < 105) {
        zone = 4;
        color = 'bg-yellow-500';
        label = 'Z4 Threshold';
    } else if (percentage < 120) {
        zone = 5;
        color = 'bg-orange-500';
        label = 'Z5 VO2 Max';
    } else {
        zone = 6;
        color = 'bg-red-500';
        label = 'Z6 Anaerobic';
    }

    // Scale for visualization (0-150% of FTP)
    const visualPercentage = Math.min(100, (percentage / 150) * 100);

    return (
        <div className="w-full space-y-2">
            <div className="flex justify-between items-end">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span>{currentPower} W</span>
                    <span className="text-xs opacity-50">({Math.round(percentage)}%)</span>
                </div>
                <div className={`text-xs font-bold px-2 py-1 rounded-full ${color} bg-opacity-20 text-white`}>
                    {label}
                </div>
            </div>

            {/* Zone Bar */}
            <div className="h-3 bg-secondary/20 rounded-full overflow-hidden relative flex">
                {/* Zone Markers (Background) - Scaled to 150% max */}
                <div className="h-full bg-gray-400/20 w-[36.6%]" title="Z1 (<55%)" /> {/* 55/150 */}
                <div className="h-full bg-blue-500/20 w-[13.3%]" title="Z2 (56-75%)" /> {/* 20/150 */}
                <div className="h-full bg-green-500/20 w-[10%]" title="Z3 (76-90%)" /> {/* 15/150 */}
                <div className="h-full bg-yellow-500/20 w-[10%]" title="Z4 (91-105%)" /> {/* 15/150 */}
                <div className="h-full bg-orange-500/20 w-[10%]" title="Z5 (106-120%)" /> {/* 15/150 */}
                <div className="h-full bg-red-500/20 w-[20.1%]" title="Z6 (>120%)" /> {/* Rest */}

                {/* Current Position Indicator */}
                <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)] transition-all duration-500 ease-out"
                    style={{ left: `${visualPercentage}%` }}
                />
            </div>

            <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
                <span className="w-[36.6%] text-center border-r border-white/5">Z1</span>
                <span className="w-[13.3%] text-center border-r border-white/5">Z2</span>
                <span className="w-[10%] text-center border-r border-white/5">Z3</span>
                <span className="w-[10%] text-center border-r border-white/5">Z4</span>
                <span className="w-[10%] text-center border-r border-white/5">Z5</span>
                <span className="w-[20.1%] text-center">Z6</span>
            </div>
        </div>
    );
}
