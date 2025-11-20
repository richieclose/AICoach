import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
    label: string;
    value: number | string;
    unit?: string;
    icon?: LucideIcon;
    color?: string; // e.g., 'text-sky-500'
}

export function MetricCard({ label, value, unit, icon: Icon, color = 'text-primary' }: MetricCardProps) {
    return (
        <div className="bg-card/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center shadow-xl">
            <div className="flex items-center gap-2 mb-2 opacity-80">
                {Icon && <Icon className={`w-5 h-5 ${color}`} />}
                <span className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight text-foreground tabular-nums">
                    {value}
                </span>
                {unit && <span className="text-lg text-muted-foreground font-medium">{unit}</span>}
            </div>
        </div>
    );
}
