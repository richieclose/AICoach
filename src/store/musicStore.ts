import { create } from 'zustand';

interface Track {
    id: string;
    name: string;
    artist: string;
    albumArt: string;
    uri: string;
    duration_ms: number;
}

interface MusicState {
    isConnected: boolean;
    deviceId: string | null;
    currentTrack: Track | null;
    isPlaying: boolean;
    volume: number;
    genre: string | null;
    syncEnabled: boolean;
    playlist: Track[];
    currentIndex: number;
    accessToken: string | null;

    setIsConnected: (connected: boolean) => void;
    setDeviceId: (id: string) => void;
    setCurrentTrack: (track: Track | null) => void;
    setIsPlaying: (playing: boolean) => void;
    setVolume: (volume: number) => void;
    setGenre: (genre: string) => void;
    setSyncEnabled: (enabled: boolean) => void;
    setPlaylist: (playlist: Track[]) => void;
    nextTrack: () => void;
    setAccessToken: (token: string) => void;
    startPlaylist: () => Promise<void>;
}

export const useMusicStore = create<MusicState>((set) => ({
    isConnected: false,
    deviceId: null,
    currentTrack: null,
    isPlaying: false,
    volume: 0.5,
    genre: null,
    syncEnabled: false,
    playlist: [],
    currentIndex: 0,
    accessToken: null,

    setIsConnected: (connected) => set({ isConnected: connected }),
    setDeviceId: (id) => set({ deviceId: id }),
    setCurrentTrack: (track) => set({ currentTrack: track }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),
    setVolume: (volume) => set({ volume }),
    setGenre: (genre) => set({ genre }),
    setSyncEnabled: (enabled) => set({ syncEnabled: enabled }),
    setPlaylist: (playlist) => set({ playlist, currentIndex: 0 }),
    nextTrack: () => set((state) => ({ currentIndex: state.currentIndex + 1 })),
    setAccessToken: (token) => set({ accessToken: token }),
    startPlaylist: async () => {
        const state = useMusicStore.getState();
        const { deviceId, playlist, currentIndex, accessToken } = state;

        if (!deviceId || !accessToken || playlist.length === 0) {
            console.warn('Cannot start playlist:', { deviceId, accessToken: !!accessToken, playlistLength: playlist.length });
            return;
        }

        const uris = playlist.map(track => track.uri);
        console.log('Starting playlist with', uris.length, 'tracks on device', deviceId);

        try {
            const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    uris: uris,
                    offset: { position: currentIndex }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to start playback:', response.status, errorText);
            } else {
                console.log('Playback started successfully');
            }
        } catch (error) {
            console.error('Error starting playback:', error);
        }
    },
}));
