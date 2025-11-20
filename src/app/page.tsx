'use client';

import React, { useEffect } from 'react';
import { ConnectionManager } from '@/components/ConnectionManager';
import { MetricCard } from '@/components/MetricCard';
import { WorkoutControls } from '@/components/WorkoutControls';
import { useBluetoothStore } from '@/lib/bluetooth/BluetoothManager';
import { useWorkoutStore } from '@/lib/workout/workoutStore';
import { ConsultationModal } from '@/components/ConsultationModal';
import { Zap, Heart, Gauge, Timer, MessageSquare } from 'lucide-react';

export default function Home() {
  const { power, heartRate, cadence } = useBluetoothStore();
  const { isActive, currentWorkout, activeIntervalIndex, intervalElapsedTime, elapsedTime, tick } = useWorkoutStore();
  const [isConsultationOpen, setIsConsultationOpen] = React.useState(false);

  // Global Timer
  useEffect(() => {
    const interval = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  const currentInterval = currentWorkout?.intervals[activeIntervalIndex];
  const nextInterval = currentWorkout?.intervals[activeIntervalIndex + 1];

  return (
    <main className="min-h-screen bg-background text-foreground p-8 flex flex-col gap-8">
      <ConsultationModal isOpen={isConsultationOpen} onClose={() => setIsConsultationOpen(false)} />

      {/* Header */}
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            AI Coach
          </h1>
          <p className="text-muted-foreground">Real-time Adaptive Training</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsConsultationOpen(true)}
            className="flex items-center gap-2 bg-secondary/10 hover:bg-secondary/20 text-secondary px-4 py-2 rounded-full text-sm font-medium transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Ask Coach
          </button>
          <ConnectionManager />
        </div>
      </header>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          label="Power"
          value={power || 0}
          unit="W"
          icon={Zap}
          color="text-yellow-400"
        />
        <MetricCard
          label="Heart Rate"
          value={heartRate || 0}
          unit="BPM"
          icon={Heart}
          color="text-red-500"
        />
        <MetricCard
          label="Cadence"
          value={cadence || 0}
          unit="RPM"
          icon={Gauge}
          color="text-blue-400"
        />
      </div>

      {/* Workout View */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 min-h-[400px] relative">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl -z-10" />

        {isActive && currentInterval ? (
          <div className="text-center space-y-6 w-full max-w-2xl">
            {/* Coach Feedback Area */}
            <div className="min-h-[80px] flex items-center justify-center">
              {useWorkoutStore.getState().lastCoachFeedback ? (
                <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-2 mb-1 text-primary font-bold uppercase text-xs tracking-wider justify-center">
                    <Zap className="w-3 h-3" /> Coach Aero says:
                  </div>
                  <p className="text-lg font-medium italic">"{useWorkoutStore.getState().lastCoachFeedback}"</p>
                </div>
              ) : (
                <div className="text-muted-foreground/40 text-sm italic">
                  Coach is analyzing your performance...
                </div>
              )}
            </div>

            <div className="flex justify-between items-end">
              <div className="text-left">
                <p className="text-sm text-muted-foreground uppercase tracking-widest mb-1">Current Interval</p>
                <h2 className="text-4xl font-bold">{currentInterval.description || currentInterval.type}</h2>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground uppercase tracking-widest mb-1">Target</p>
                <div className="text-4xl font-bold text-primary">{currentInterval.targetPower} <span className="text-xl text-muted-foreground">W</span></div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-4 bg-secondary/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-secondary transition-all duration-1000 ease-linear"
                style={{ width: `${(intervalElapsedTime / currentInterval.duration) * 100}%` }}
              />
            </div>

            <div className="flex justify-between text-2xl font-mono font-medium tabular-nums">
              <span>{formatTime(intervalElapsedTime)}</span>
              <span className="text-muted-foreground">/ {formatTime(currentInterval.duration)}</span>
            </div>

            {nextInterval && (
              <div className="bg-card/50 p-4 rounded-xl border border-white/5 text-left">
                <p className="text-xs text-muted-foreground uppercase mb-1">Up Next</p>
                <div className="flex justify-between items-center">
                  <span className="font-medium">{nextInterval.description || nextInterval.type}</span>
                  <span className="text-primary font-bold">{nextInterval.targetPower} W</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <p className="text-xl">Ready to ride?</p>
            <p className="text-sm opacity-60">Connect your bike and start a workout.</p>
          </div>
        )}

        <WorkoutControls />
      </div>
    </main>
  );
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
