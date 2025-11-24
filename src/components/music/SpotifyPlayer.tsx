'use client';

import { useEffect, useState } from 'react';
import { useMusicStore } from '@/store/musicStore';
import { Play, Pause, SkipForward, Volume2 } from 'lucide-react';

interface SpotifyPlayerProps {
    accessToken: string;
}

export default function SpotifyPlayer({ accessToken }: SpotifyPlayerProps) {
    const {
        setDeviceId,
        setIsConnected,
        setCurrentTrack,
        setIsPlaying,
        currentTrack,
        isPlaying,
        nextTrack,
        playlist,
        currentIndex,
        setAccessToken,
        volume,
        setVolume
    } = useMusicStore();

    const [player, setPlayer] = useState<Spotify.Player | null>(null);

    useEffect(() => {
        // Store access token in music store
        setAccessToken(accessToken);

        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.body.appendChild(script);

        window.onSpotifyWebPlaybackSDKReady = () => {
            const newPlayer = new window.Spotify.Player({
                name: 'AI Coach Player',
                getOAuthToken: (cb) => {
                    cb(accessToken);
                },
                volume: 0.5,
            });

            setPlayer(newPlayer);

            newPlayer.addListener('ready', ({ device_id }) => {
                console.log('Ready with Device ID', device_id);
                setDeviceId(device_id);
                setIsConnected(true);
            });

            newPlayer.addListener('not_ready', ({ device_id }) => {
                console.log('Device ID has gone offline', device_id);
                setIsConnected(false);
            });

            newPlayer.addListener('player_state_changed', (state) => {
                if (!state) return;

                setIsPlaying(!state.paused);

                const track = state.track_window.current_track;
                setCurrentTrack({
                    id: track.id || '',
                    name: track.name,
                    artist: track.artists[0].name,
                    albumArt: track.album.images[0]?.url || '',
                    uri: track.uri,
                    duration_ms: track.duration_ms
                });
            });

            newPlayer.connect();
        };

        return () => {
            // Cleanup if needed
        };
    }, [accessToken, setDeviceId, setIsConnected, setCurrentTrack, setIsPlaying, setAccessToken]);

    // Start playing the playlist via Spotify Web API
    const startPlaylist = async () => {
        const deviceId = useMusicStore.getState().deviceId;

        if (!deviceId || playlist.length === 0) {
            console.warn('Cannot start playlist: deviceId or playlist missing', { deviceId, playlistLength: playlist.length });
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
    };

    const handleNext = async () => {
        nextTrack(); // Update store index
        // The SDK will handle playing the next track automatically
    };

    if (!accessToken) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-4 flex items-center justify-between z-50">
            <div className="flex items-center gap-4 w-1/3">
                {currentTrack && (
                    <>
                        <img src={currentTrack.albumArt} alt="Album Art" className="w-12 h-12 rounded" />
                        <div>
                            <div className="font-medium text-white truncate">{currentTrack.name}</div>
                            <div className="text-sm text-zinc-400 truncate">{currentTrack.artist}</div>
                        </div>
                    </>
                )}
            </div>

            <div className="flex items-center gap-6 justify-center w-1/3">
                <button
                    className="p-2 hover:bg-zinc-800 rounded-full transition"
                    onClick={() => {
                        if (isPlaying) {
                            player?.pause();
                        } else if (playlist.length > 0 && !currentTrack) {
                            // First time playing - start the playlist
                            startPlaylist();
                        } else {
                            // Resume playback
                            player?.resume();
                        }
                    }}
                >
                    {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white" />}
                </button>
                <button
                    className="p-2 hover:bg-zinc-800 rounded-full transition"
                    onClick={() => player?.nextTrack()}
                >
                    <SkipForward className="w-6 h-6 text-white" />
                </button>
            </div>

            <div className="flex items-center justify-end gap-2 w-1/3">
                <Volume2 className="w-5 h-5 text-zinc-400" />
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume * 100}
                    onChange={(e) => {
                        const newVolume = parseInt(e.target.value) / 100;
                        setVolume(newVolume);
                        if (player) {
                            player.setVolume(newVolume);
                        }
                    }}
                    className="w-24 h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer"
                />
            </div>
        </div>
    );
}
