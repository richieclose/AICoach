import React, { useEffect, useState } from 'react';
import { X, User, Calendar, Heart, Zap, Gauge } from 'lucide-react';
import { useUserStore } from '@/lib/user/userStore';
import { updateUserProfile } from '@/app/actions/user';
import { useSession, signOut, signIn } from 'next-auth/react';

interface UserSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
    const { name, dob, maxHr, ftp, weight, setName, setDob, setMaxHr, setFtp, setWeight, syncWithDb, clearUserData } = useUserStore();
    const [localName, setLocalName] = useState(name);
    const [localDob, setLocalDob] = useState(dob);
    const [localMaxHr, setLocalMaxHr] = useState(maxHr);
    const [localFtp, setLocalFtp] = useState(ftp);
    const [localWeight, setLocalWeight] = useState(weight);
    const [isSaving, setIsSaving] = useState(false);

    const { data: session } = useSession();

    useEffect(() => {
        if (isOpen && session) {
            syncWithDb(); // Fetch latest from DB when opening only if logged in
        }
    }, [isOpen, syncWithDb, session]);

    useEffect(() => {
        setLocalName(name);
        setLocalDob(dob);
        setLocalMaxHr(maxHr);
        setLocalFtp(ftp);
        setLocalWeight(weight);
    }, [name, dob, maxHr, ftp, weight]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (session) {
                await updateUserProfile({
                    name: localName,
                    ftp: localFtp,
                    weight: localWeight,
                });
            } else {
                console.log("User not logged in, saving locally only.");
            }

            setName(localName);
            setDob(localDob);
            setMaxHr(localMaxHr);
            setFtp(localFtp);
            setWeight(localWeight);
            onClose();
        } catch (error) {
            console.error("Failed to save profile:", error);
            // Fallback to local update if DB fails (or maybe show error)
            setName(localName);
            setDob(localDob);
            setMaxHr(localMaxHr);
            setFtp(localFtp);
            setWeight(localWeight);
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    const calculateMaxHr = (dobString: string) => {
        if (!dobString) return;
        const birthDate = new Date(dobString);
        const ageDifMs = Date.now() - birthDate.getTime();
        const ageDate = new Date(ageDifMs);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
        setLocalMaxHr(220 - age);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Rider Profile
                    </h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Name</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={localName}
                                onChange={(e) => setLocalName(e.target.value)}
                                className="w-full bg-secondary/10 border border-white/5 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="Enter your name"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="date"
                                value={localDob}
                                onChange={(e) => {
                                    setLocalDob(e.target.value);
                                    calculateMaxHr(e.target.value);
                                }}
                                className="w-full bg-secondary/10 border border-white/5 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Max Heart Rate</label>
                        <div className="relative">
                            <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="number"
                                value={localMaxHr}
                                onChange={(e) => setLocalMaxHr(Number(e.target.value))}
                                className="w-full bg-secondary/10 border border-white/5 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">Auto-calculated from age (220 - Age) if DOB is set.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Weight (kg)</label>
                        <div className="relative">
                            <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="number"
                                value={localWeight}
                                onChange={(e) => setLocalWeight(Number(e.target.value))}
                                className="w-full bg-secondary/10 border border-white/5 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">Used for Watts/kg calculations.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">FTP (Functional Threshold Power)</label>
                        <div className="relative">
                            <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="number"
                                value={localFtp}
                                onChange={(e) => setLocalFtp(Number(e.target.value))}
                                className="w-full bg-secondary/10 border border-white/5 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">Used to calculate power zones and workout targets.</p>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-xl transition-colors mt-4 disabled:opacity-50"
                    >
                        {isSaving ? 'Saving...' : 'Save Profile'}
                    </button>

                    {session ? (
                        <button
                            onClick={() => {
                                clearUserData();
                                signOut();
                            }}
                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-medium py-3 rounded-xl transition-colors mt-2"
                        >
                            Sign Out
                        </button>
                    ) : (
                        <button
                            onClick={() => signIn('spotify')}
                            className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-bold py-3 rounded-xl transition-colors mt-2 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                            </svg>
                            Log In with Spotify
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
