'use client';

import React, { useState } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';

interface ConsultationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ConsultationModal({ isOpen, onClose }: ConsultationModalProps) {
    const [history, setHistory] = useState('');
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleConsult = async () => {
        if (!history.trim()) return;

        setIsLoading(true);
        try {
            const res = await fetch('/api/coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'consultation',
                    data: { history }
                })
            });
            const data = await res.json();
            setResponse(data.message);

            // Speak response
            const utterance = new SpeechSynthesisUtterance(data.message);
            window.speechSynthesis.speak(utterance);

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
                        <h3 className="font-semibold">Pre-Workout Consultation</h3>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {!response ? (
                        <>
                            <p className="text-muted-foreground text-sm">
                                Tell Coach Aero about your recent training or how you're feeling today.
                            </p>
                            <textarea
                                className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none min-h-[100px]"
                                placeholder="e.g., I'm feeling a bit tired from yesterday's ride, but I want to do some light cardio."
                                value={history}
                                onChange={(e) => setHistory(e.target.value)}
                            />
                            <button
                                onClick={handleConsult}
                                disabled={isLoading || !history}
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isLoading ? 'Thinking...' : (
                                    <>
                                        <Send className="w-4 h-4" /> Get Advice
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
                                onClick={onClose}
                                className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground py-2 rounded-xl font-medium transition-colors"
                            >
                                Let's Ride!
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
