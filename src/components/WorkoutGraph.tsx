'use client';

import React, { useMemo } from 'react';
import { useWorkoutStore } from '@/lib/workout/workoutStore';
import { IntervalType } from '@/lib/workout/types';
import { useUserStore } from '@/lib/user/userStore';

// Helper to convert HSL to Hex
function hslToHex(h: number, s: number, l: number) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

export function WorkoutGraph({ className }: { className?: string }) {
    const { currentWorkout, elapsedTime } = useWorkoutStore();
    const { ftp } = useUserStore();

    const { intervals, maxPower, totalDuration } = useMemo(() => {
        if (!currentWorkout) return { intervals: [], maxPower: 100, totalDuration: 1 };

        const maxP = Math.max(...currentWorkout.intervals.map(i => i.targetPower), 100);
        // Add some headroom
        return {
            intervals: currentWorkout.intervals,
            maxPower: maxP * 1.1,
            totalDuration: currentWorkout.totalDuration
        };
    }, [currentWorkout]);

    if (!currentWorkout) return null;

    // SVG Dimensions - logical coords, not pixels
    const width = 800;
    const height = 200;
    const topPadding = 30; // Reserve space for labels

    // Scales
    const xScale = (time: number) => (time / totalDuration) * width;
    const yScale = (power: number) => height - (power / maxPower) * (height - topPadding);

    // Helper to format duration
    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        if (m > 0 && s > 0) return `${m}m ${s}s`;
        if (m > 0) return `${m}m`;
        return `${s}s`;
    };

    // Helper to get color based on intensity
    const getIntervalColor = (targetPower: number) => {
        const intensity = targetPower / (ftp || 200); // Default to 200 if FTP not set

        // Map intensity to Hue:
        // 0.5 (50%) -> 120 (Green)
        // 1.2 (120%) -> 0 (Red)
        // Clamp intensity between 0.5 and 1.2 for color mapping
        const minInt = 0.5;
        const maxInt = 1.2;
        const clampedInt = Math.max(minInt, Math.min(maxInt, intensity));

        // Interpolate Hue
        // 0.5 -> 120
        // 1.2 -> 0
        // Slope = (0 - 120) / (1.2 - 0.5) = -120 / 0.7 = -171.4
        const hue = 120 - ((clampedInt - minInt) / (maxInt - minInt)) * 120;

        return hslToHex(hue, 80, 50); // Saturation 80%, Lightness 50%
    };

    let currentX = 0;

    return (
        <div className={`w-full bg-card/30 rounded-xl border border-white/5 p-4 relative overflow-hidden ${className}`}>
            <svg
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
                className="w-full h-full"
            >
                {/* Grid Lines (Optional) */}
                <line x1="0" y1={yScale(100)} x2={width} y2={yScale(100)} stroke="white" strokeOpacity="0.1" strokeDasharray="4 4" />
                <line x1="0" y1={yScale(200)} x2={width} y2={yScale(200)} stroke="white" strokeOpacity="0.1" strokeDasharray="4 4" />

                {/* Intervals */}
                {intervals.map((interval, index) => {
                    const x = xScale(currentX);
                    const w = xScale(interval.duration);
                    const h = height - yScale(interval.targetPower);
                    const y = yScale(interval.targetPower);

                    currentX += interval.duration;

                    return (
                        <g key={interval.id || index} className="group">
                            <rect
                                x={x}
                                y={y}
                                width={w}
                                height={h}
                                fill={getIntervalColor(interval.targetPower)}
                                opacity={0.8}
                                stroke="white"
                                strokeWidth="1"
                                strokeOpacity="0.2"
                                className="transition-opacity hover:opacity-100"
                            >
                                <title>
                                    {`Target: ${interval.targetPower}W\nDuration: ${formatDuration(interval.duration)}\nType: ${interval.type}`}
                                </title>
                            </rect>

                            {/* Labels if block is wide enough */}
                            {w > 20 && (
                                <>
                                    <text
                                        x={x + w / 2}
                                        y={y - 12}
                                        fill="white"
                                        fontSize="10"
                                        fontWeight="bold"
                                        textAnchor="middle"
                                        opacity="0.9"
                                        style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}
                                    >
                                        {interval.targetPower}W
                                    </text>
                                    <text
                                        x={x + w / 2}
                                        y={y - 2}
                                        fill="white"
                                        fontSize="8"
                                        textAnchor="middle"
                                        opacity="0.7"
                                        style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}
                                    >
                                        {formatDuration(interval.duration)}
                                    </text>
                                </>
                            )}
                        </g>
                    );
                })}

                {/* Progress Line */}
                <line
                    x1={xScale(elapsedTime)}
                    y1="0"
                    x2={xScale(elapsedTime)}
                    y2={height}
                    stroke="white"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                />

                {/* Progress Shade (past) */}
                <rect
                    x="0"
                    y="0"
                    width={xScale(elapsedTime)}
                    height={height}
                    fill="black"
                    opacity="0.3"
                />
            </svg>
        </div>
    );
}
