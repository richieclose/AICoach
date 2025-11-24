'use client';

import { X } from 'lucide-react';
import MusicSetup from './music/MusicSetup';

interface MusicModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MusicModal({ isOpen, onClose }: MusicModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-1">
                    <MusicSetup />
                </div>

                <div className="p-4 border-t border-zinc-800">
                    <button
                        onClick={onClose}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 rounded transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
