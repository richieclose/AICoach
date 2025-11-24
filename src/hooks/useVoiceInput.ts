import { useState, useEffect, useCallback } from 'react';

interface UseVoiceInputReturn {
    isListening: boolean;
    transcript: string;
    startListening: () => void;
    stopListening: () => void;
    resetTranscript: () => void;
    error: string | null;
    isSupported: boolean;
}

export function useVoiceInput(): UseVoiceInputReturn {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [recognition, setRecognition] = useState<any>(null);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && (window as any).webkitSpeechRecognition) {
            setIsSupported(true);
            const r = new (window as any).webkitSpeechRecognition();
            r.continuous = true;
            r.interimResults = true;
            r.lang = 'en-US';

            r.onstart = () => {
                console.log('Speech recognition started');
                setIsListening(true);
            };
            r.onend = () => {
                console.log('Speech recognition ended');
                setIsListening(false);
            };
            r.onerror = (event: any) => {
                if (event.error === 'no-speech') {
                    console.warn('Speech recognition: no speech detected');
                    setError('No speech detected. Please check your microphone.');
                    setIsListening(false);
                    return;
                }
                console.error('Speech recognition error', event.error);
                setError(`Error: ${event.error}`);
                setIsListening(false);
            };

            r.onsoundstart = () => {
                console.log('Speech recognition: Sound detected');
            };

            let finalTranscriptAccumulated = '';

            r.onresult = (event: any) => {
                console.log('Speech recognition result received', event.results);
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscriptAccumulated += event.results[i][0].transcript;
                    } else {
                        interimTranscript += event.results[i][0].transcript;
                    }
                }
                const fullTranscript = finalTranscriptAccumulated + interimTranscript;
                console.log('Transcript updated:', fullTranscript);
                setTranscript(fullTranscript);
            };

            setRecognition(r);
        }
    }, []);

    const startListening = useCallback(async () => {
        if (recognition && !isListening) {
            try {
                // Explicitly check mic access first to ensure hardware is ready
                // This often "wakes up" the audio subsystem
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop()); // Close stream immediately

                recognition.start();
                setError(null);
            } catch (e) {
                console.error('Microphone check failed:', e);
                setError('Could not access microphone. Check system settings.');
            }
        }
    }, [recognition, isListening]);

    const stopListening = useCallback(() => {
        if (recognition && isListening) {
            recognition.stop();
        }
    }, [recognition, isListening]);

    const resetTranscript = useCallback(() => {
        setTranscript('');
    }, []);

    return {
        isListening,
        transcript,
        startListening,
        stopListening,
        resetTranscript,
        error,
        isSupported
    };
}
