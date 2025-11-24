import React, { useEffect, useState } from 'react';
import { X, User, Calendar, Heart, Zap, Gauge } from 'lucide-react';
import { useUserStore } from '@/lib/user/userStore';
import { updateUserProfile } from '@/app/actions/user';
import { useSession } from 'next-auth/react';

interface UserSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function UserSettingsModal({ isOpen, onClose }: UserSettingsModalProps) {
    const { name, dob, maxHr, ftp, weight, setName, setDob, setMaxHr, setFtp, setWeight, syncWithDb } = useUserStore();
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
                </div>
            </div>
        </div>
    );
}
