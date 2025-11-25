import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
    name: string;
    dob: string; // YYYY-MM-DD
    maxHr: number;
    ftp: number;
    weight: number; // kg
    setName: (name: string) => void;
    setDob: (dob: string) => void;
    setMaxHr: (maxHr: number) => void;
    setFtp: (ftp: number) => void;
    setWeight: (weight: number) => void;
    syncWithDb: () => Promise<void>;
    clearUserData: () => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set, get) => ({
            name: '',
            dob: '',
            maxHr: 190, // Default
            ftp: 200, // Default FTP
            weight: 75, // Default weight
            setName: (name) => set({ name }),
            setDob: (dob) => set({ dob }),
            setMaxHr: (maxHr) => set({ maxHr }),
            setFtp: (ftp) => set({ ftp }),
            setWeight: (weight) => set({ weight }),

            clearUserData: () => set({
                name: '',
                dob: '',
                maxHr: 190,
                ftp: 200,
                weight: 75
            }),

            syncWithDb: async () => {
                try {
                    // Dynamic import to avoid server-side issues in store init if possible, 
                    // though actions are safe to import.
                    const { getUserProfile } = await import('../../app/actions/user');
                    const profile = await getUserProfile();
                    if (profile) {
                        set({
                            name: profile.name || get().name,
                            ftp: profile.ftp || get().ftp,
                            weight: profile.weight || get().weight,
                        });
                    }
                } catch (error) {
                    console.error("Failed to sync user profile:", error);
                }
            }
        }),
        {
            name: 'user-storage',
        }
    )
);
