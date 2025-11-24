'use client';

import React from 'react';
import { useBluetoothStore } from '@/lib/bluetooth/BluetoothManager';
import { Bluetooth, Activity, Zap, Heart } from 'lucide-react';

export function ConnectionManager() {
    const { isBikeConnected, isHRConnected, bikeDeviceName, hrDeviceName, connectBike, connectHeartRate, disconnect, isSimulating, toggleSimulation } = useBluetoothStore();

    return (
        <div className="flex items-center gap-4 bg-card/30 backdrop-blur-sm p-2 rounded-full border border-white/5 px-4">
            {/* Bike Status */}
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isBikeConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                <span className="text-sm font-medium text-foreground/80 hidden md:inline">
                    {isBikeConnected ? (bikeDeviceName || 'Bike') : 'No Bike'}
                </span>
            </div>

            {/* HR Status */}
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isHRConnected ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-gray-500'}`} />
                <span className="text-sm font-medium text-foreground/80 hidden md:inline">
                    {isHRConnected ? (hrDeviceName || 'HRM') : 'No HR'}
                </span>
            </div>

            <div className="h-4 w-px bg-white/10 mx-2" />

            {!isBikeConnected && (
                <button
                    onClick={connectBike}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold transition-all shadow-lg shadow-primary/20"
                >
                    <Bluetooth className="w-4 h-4" />
                    <span className="hidden sm:inline">Connect Bike</span>
                    <span className="sm:hidden">Bike</span>
                </button>
            )}

            {!isHRConnected && (
                <button
                    onClick={connectHeartRate}
                    className="flex items-center gap-2 bg-secondary/20 hover:bg-secondary/30 text-secondary px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                >
                    <Heart className="w-4 h-4" />
                    <span className="hidden sm:inline">Connect HR</span>
                    <span className="sm:hidden">HR</span>
                </button>
            )}

            {(isBikeConnected || isHRConnected) && (
                <button
                    onClick={disconnect}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                >
                    Disconnect All
                </button>
            )}

            <button
                onClick={toggleSimulation}
                className={`ml-2 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors border ${isSimulating
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    : 'bg-transparent text-muted-foreground border-transparent hover:bg-white/5'
                    }`}
            >
                <Activity className="w-3 h-3" />
                {isSimulating ? 'Sim' : 'Sim Mode'}
            </button>
        </div>
    );
}
