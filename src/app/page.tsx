'use client';

import React, { useEffect, useRef } from 'react';
import { ConnectionManager } from '@/components/ConnectionManager';
import { MetricCard } from '@/components/MetricCard';
import { WorkoutControls } from '@/components/WorkoutControls';
import { useBluetoothStore } from '@/lib/bluetooth/BluetoothManager';
import { useWorkoutStore } from '@/lib/workout/workoutStore';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { ConsultationModal } from '@/components/ConsultationModal';
import { UserSettingsModal } from '@/components/UserSettingsModal';
import { WorkoutGraph } from '@/components/WorkoutGraph';
import { HeartRateZoneBar } from '@/components/HeartRateZoneBar';
import { PowerZoneBar } from '@/components/PowerZoneBar';
import { useUserStore } from '@/lib/user/userStore';
import { MusicModal } from '@/components/MusicModal';
import { Zap, Heart, Gauge, Timer, MessageSquare, Settings, User, Upload, Music, History } from 'lucide-react';
import { parseZwo } from '@/lib/workout/zwoParser';
import Link from 'next/link';

export default function Home() {
  const { power, heartRate, cadence } = useBluetoothStore();
  const { isActive, currentWorkout, activeIntervalIndex, intervalElapsedTime, elapsedTime, tick, lastCoachFeedback, isPending, pendingModification, applyModification, rejectModification, startWorkout } = useWorkoutStore();
  const { transcript, resetTranscript, startListening, isListening } = useVoiceInput(); // We need voice input here too
  const [isConsultationOpen, setIsConsultationOpen] = React.useState(false);
  const [isUserOpen, setIsUserOpen] = React.useState(false);
  const [isMusicOpen, setIsMusicOpen] = React.useState(false);
  const { maxHr, ftp } = useUserStore();
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
      } catch (error) {
        console.error("Failed to parse ZWO:", error);
        alert("Invalid ZWO file");
      }
    };
    reader.readAsText(file);
  };

  // Voice Command Listener for Modifications
  React.useEffect(() => {
    if (pendingModification && transcript) {
      const lower = transcript.toLowerCase();
      if (lower.includes('accept') || lower.includes('yes')) {
        applyModification();
        resetTranscript();
      } else if (lower.includes('reject') || lower.includes('no')) {
        rejectModification();
        resetTranscript();
      }
    }
  }, [pendingModification, transcript, applyModification, rejectModification, resetTranscript]);

  // Ensure voice listening is active if modification is pending? 
  // Ideally we want it always active or auto-activate. 
  // For now, let's auto-start listening when modification appears if not already.
  React.useEffect(() => {
    if (pendingModification && !isListening) {
      startListening();
    }
  }, [pendingModification, isListening, startListening]);

  // Global Timer
  useEffect(() => {
    const interval = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  const currentInterval = currentWorkout?.intervals?.[activeIntervalIndex];
  const nextInterval = currentWorkout?.intervals?.[activeIntervalIndex + 1];

  return (
    <main className="h-screen bg-background text-foreground p-4 flex flex-col gap-4 overflow-hidden">
      <ConsultationModal isOpen={isConsultationOpen} onClose={() => setIsConsultationOpen(false)} />
      <UserSettingsModal isOpen={isUserOpen} onClose={() => setIsUserOpen(false)} />
      <MusicModal isOpen={isMusicOpen} onClose={() => setIsMusicOpen(false)} />

      {/* Header - Compact */}
      <header className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            AI Coach
          </h1>
          <span className="text-xs text-muted-foreground hidden sm:inline">Real-time Adaptive Training</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".zwo"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-secondary/10 hover:bg-secondary/20 text-secondary px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          >
            <Upload className="w-3 h-3" />
            Import
          </button>
          <button
            onClick={() => setIsUserOpen(true)}
            className="flex items-center gap-2 bg-secondary/10 hover:bg-secondary/20 text-secondary px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          >
            <User className="w-3 h-3" />
            Profile
          </button>
          <button
            onClick={() => setIsMusicOpen(true)}
            className="flex items-center gap-2 bg-secondary/10 hover:bg-secondary/20 text-secondary px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          >
            <Music className="w-3 h-3" />
            Music
          </button>
          <button
            onClick={() => setIsConsultationOpen(true)}
            className="flex items-center gap-2 bg-secondary/10 hover:bg-secondary/20 text-secondary px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          >
            <MessageSquare className="w-3 h-3" />
            Ask Coach
          </button>
          <Link
            href="/history"
            className="flex items-center gap-2 bg-secondary/10 hover:bg-secondary/20 text-secondary px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
          >
            <History className="w-3 h-3" />
            History
          </Link>
          <ConnectionManager />
        </div>
      </header>

      {/* Metrics Grid - Compact */}
      <div className="grid grid-cols-3 gap-4 shrink-0 h-32">
        <div className="relative h-full">
          <MetricCard
            label="Power"
            value={power || 0}
            unit="W"
            icon={Zap}
            color="text-yellow-400"
          />
          <div className="absolute -bottom-4 left-0 right-0 px-2">
            <PowerZoneBar currentPower={power || 0} ftp={ftp} />
          </div>
        </div>
        <div className="relative h-full">
          <MetricCard
            label="Heart Rate"
            value={heartRate || 0}
            unit="BPM"
            icon={Heart}
            color="text-red-500"
          />
          <div className="absolute -bottom-4 left-0 right-0 px-2">
            <HeartRateZoneBar currentHr={heartRate || 0} maxHr={maxHr} />
          </div>
        </div>
        <div className="h-full">
          <MetricCard
            label="Cadence"
            value={cadence || 0}
            unit="RPM"
            icon={Gauge}
            color="text-blue-400"
          />
        </div>
      </div>

      {/* Main Content Area - Flexible */}
      <div className="flex-1 flex flex-col min-h-0 gap-4 relative">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent rounded-3xl -z-10" />

        {isActive && currentInterval ? (
          <div className="flex flex-col h-full gap-4">

            {/* Top Info Bar: Title & Feedback */}
            <div className="flex justify-between items-start shrink-0 px-2">
              <div>
                <h2 className="text-xl font-bold">{currentWorkout.name}</h2>
                {currentWorkout.description && (
                  <p className="text-sm text-muted-foreground max-w-2xl">{currentWorkout.description}</p>
                )}
              </div>
              {/* Coach Feedback Toast */}
              {lastCoachFeedback && (
                <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-lg animate-in fade-in slide-in-from-top-2 max-w-md">
                  <div className="flex items-center gap-2 text-primary font-bold uppercase text-[10px] tracking-wider">
                    <Zap className="w-3 h-3" /> Coach Aero
                  </div>
                  <p className="text-sm font-medium italic">"{lastCoachFeedback}"</p>
                </div>
              )}
            </div>

            {/* Graph Area with Overlays */}
            <div className="flex-1 relative min-h-0">
              <WorkoutGraph className="h-full" />

              {/* Pedal to Start Overlay */}
              {isPending && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/40 z-10 rounded-xl">
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-xl animate-pulse flex flex-col items-center gap-2 backdrop-blur-md">
                    <Zap className="w-8 h-8 text-yellow-500" />
                    <h3 className="text-xl font-bold text-yellow-500">Pedal to Start</h3>
                    <p className="text-sm text-muted-foreground">Start pedaling to begin the timer</p>
                  </div>
                </div>
              )}

              {/* Coach Modification Overlay */}
              {pendingModification && (
                <div className="absolute bottom-4 right-4 left-4 md:left-auto md:w-96 bg-background/95 border border-blue-500/30 p-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom-10 z-20">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <MessageSquare className="w-5 h-5" />
                    <h3 className="font-bold">Coach Suggestion</h3>
                  </div>
                  <p className="text-sm mb-3">
                    {pendingModification.reason}. <br />
                    <span className="font-bold">
                      {pendingModification.value > 0 ? 'Increase' : 'Decrease'} {pendingModification.type} by {Math.abs(pendingModification.value)}
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => applyModification()} className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-500 py-2 rounded-lg text-xs font-bold">Accept</button>
                    <button onClick={() => rejectModification()} className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-500 py-2 rounded-lg text-xs font-bold">Reject</button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Data Row */}
            <div className="grid grid-cols-12 gap-4 shrink-0 h-24">
              {/* Current Interval */}
              <div className="col-span-3 bg-card/50 rounded-xl p-3 border border-white/5 flex flex-col justify-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Current Interval</p>
                <h2 className="text-2xl font-bold truncate">{currentInterval.description || currentInterval.type}</h2>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-bold text-primary">{currentInterval.targetPower}</span>
                  <span className="text-sm text-muted-foreground">W Target</span>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="col-span-6 flex flex-col justify-center gap-3 px-4">
                {/* Interval Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>Interval</span>
                    <span>{formatTime(intervalElapsedTime)} / {formatTime(currentInterval.duration)}</span>
                  </div>
                  <div className="h-3 bg-secondary/20 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary transition-all duration-1000 ease-linear" style={{ width: `${(intervalElapsedTime / currentInterval.duration) * 100}%` }} />
                  </div>
                </div>
                {/* Total Progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                    <span>Total</span>
                    <span>{formatTime(elapsedTime)} / {formatTime(currentWorkout.totalDuration || 0)}</span>
                  </div>
                  <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-1000 ease-linear" style={{ width: `${(elapsedTime / (currentWorkout.totalDuration || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* Next Interval */}
              <div className="col-span-3 bg-card/50 rounded-xl p-3 border border-white/5 flex flex-col justify-center opacity-70">
                {nextInterval ? (
                  <>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Up Next</p>
                    <div className="font-medium truncate">{nextInterval.description || nextInterval.type}</div>
                    <div className="text-xl font-bold text-primary mt-1">{nextInterval.targetPower} W</div>
                  </>
                ) : (
                  <div className="text-center text-muted-foreground text-sm">Finish Line</div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="shrink-0">
              <WorkoutControls />
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground space-y-4">
            <div className="p-8 rounded-full bg-secondary/5">
              <Zap className="w-16 h-16 text-secondary/50" />
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">Ready to ride?</p>
              <p className="text-sm opacity-60">Import a workout or ask Coach Aero to create one.</p>
            </div>
            <WorkoutControls />
          </div>
        )}
      </div>
    </main>
  );
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
