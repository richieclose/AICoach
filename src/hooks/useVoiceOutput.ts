import { useState, useEffect, useCallback } from 'react';

interface UseVoiceOutputReturn {
    speak: (text: string) => void;
    cancel: () => void;
    isSpeaking: boolean;
    isSupported: boolean;
}

export function useVoiceOutput(): UseVoiceOutputReturn {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            setIsSupported(true);

            const loadVoices = () => {
                const voices = window.speechSynthesis.getVoices();
                // Prefer a natural sounding English voice (e.g., Google US English, Microsoft Zira)
                const preferredVoice = voices.find(v =>
                    v.name.includes('Google US English') ||
                    v.name.includes('Zira') ||
                    v.lang === 'en-US'
                );
                setVoice(preferredVoice || voices[0]);
            };

            loadVoices();
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    const speak = useCallback((text: string) => {
        if (!isSupported) return;

        // Cancel any current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        if (voice) {
            utterance.voice = voice;
        }

        // Adjust rate/pitch if needed
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, [isSupported, voice]);

    const cancel = useCallback(() => {
        if (isSupported) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, [isSupported]);

    return {
        speak,
        cancel,
        isSpeaking,
        isSupported
    };
}
