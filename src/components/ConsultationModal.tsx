import React, { useState } from 'react';
import { MessageSquare, X, Send, Dumbbell, Mic, MicOff } from 'lucide-react';
import { useWorkoutStore } from '@/lib/workout/workoutStore';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useVoiceOutput } from '@/hooks/useVoiceOutput';
import { useUserStore } from '@/lib/user/userStore';

interface ConsultationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ConsultationModal({ isOpen, onClose }: ConsultationModalProps) {
    const { speak, cancel: cancelSpeech } = useVoiceOutput();

    const handleClose = () => {
        cancelSpeech();
        onClose();
    };
    const [history, setHistory] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { startWorkout } = useWorkoutStore();
    const { isListening, transcript, startListening, stopListening, resetTranscript, isSupported: isVoiceInputSupported, error: voiceError } = useVoiceInput();
    const { name, ftp } = useUserStore();

    // Update history when transcript changes
    React.useEffect(() => {
        if (transcript) {
            setHistory(prev => {
                // Avoid duplicating if transcript appends
                // Simple approach: replace current input with transcript if listening
                return transcript;
            });
        }
    }, [transcript]);

    const handleConsult = async () => {
        if (!history.trim()) return;

        setIsLoading(true);
        try {
            // Check if user wants to create a workout
            const isWorkoutRequest = history.toLowerCase().includes('create') ||
                history.toLowerCase().includes('workout') ||
                history.toLowerCase().includes('generate');

            const action = isWorkoutRequest ? 'generate_workout' : 'consultation';
            const payload = isWorkoutRequest ? { userRequest: history, ftp } : { history, userName: name };

            const res = await fetch('/api/coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    data: payload
                })
            });

            if (!res.ok) {
                throw new Error('Failed to fetch from Coach API');
            }

            const data = await res.json();

            if (isWorkoutRequest) {
                if (data.error) {
                    throw new Error(data.error);
                }
                // If it's a workout, start it!
                startWorkout(data);
                onClose();
                setHistory('');
                setResponse('');
            } else {
                setResponse(data.message);
                // Speak response
                speak(data.message);
            }

        } catch (error) {
            console.error('Consultation failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-muted/20">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        <h3 className="font-semibold">Coach Aero</h3>
                    </div>
                    <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {!response ? (
                        <>
                            <p className="text-muted-foreground text-sm">
                                Ask for advice or say "Create a [type] workout" to generate a custom session.
                            </p>
                            <textarea
                                className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none min-h-[100px]"
                                placeholder="e.g., Create a 45 minute tempo workout"
                                value={history}
                                onChange={(e) => setHistory(e.target.value)}
                            />
                            {isListening && (
                                <p className="text-xs text-primary animate-pulse">
                                    Listening... Speak now
                                </p>
                            )}
                            {/* Show voice error if any (e.g. no-speech) */}
                            {!isListening && voiceError && (
                                <p className="text-xs text-red-400">
                                    {voiceError}
                                </p>
                            )}

                            {isVoiceInputSupported && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={isListening ? stopListening : startListening}
                                        className={`p-2 rounded-full transition-all ${isListening
                                            ? 'bg-red-500/20 text-red-500 animate-pulse'
                                            : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
                                            }`}
                                        title={isListening ? 'Stop Listening' : 'Start Voice Input'}
                                    >
                                        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handleConsult}
                                disabled={isLoading || !history}
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? 'Thinking...' : (
                                    <>
                                        {history.toLowerCase().includes('create') ? <Dumbbell className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                                        {history.toLowerCase().includes('create') ? 'Generate Workout' : 'Get Advice'}
                                    </>
                                )}
                            </button>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl">
                                <p className="text-sm font-medium text-primary mb-1">Coach Aero:</p>
                                <p className="italic">{response}</p>
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground py-2 rounded-xl font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
