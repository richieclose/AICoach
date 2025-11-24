'use client';

import { useState, useEffect } from 'react';
import { useMusicStore } from '@/store/musicStore';
import { generatePlaylistForWorkout } from '@/lib/music/playlistGenerator';
import { useWorkoutStore } from '@/lib/workout/workoutStore';
import { Loader2, Music, CheckCircle, AlertCircle, LogIn, X } from 'lucide-react';
import SpotifyPlayer from './SpotifyPlayer';
import { useSession, signIn } from 'next-auth/react';

export default function MusicSetup() {
    const { data: session } = useSession();
    const [genre, setGenre] = useState('Rock');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { setPlaylist, playlist, isConnected } = useMusicStore();
    const { currentWorkout } = useWorkoutStore();

    // @ts-ignore
    const accessToken = session?.accessToken as string;

    const handleGenerate = async () => {
        if (!accessToken) {
            setError('Please log in with Spotify first');
            return;
        }
        if (!currentWorkout) {
            setError('No workout loaded. Please load a workout first.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const tracks = await generatePlaylistForWorkout(currentWorkout, genre, accessToken);
            setPlaylist(tracks);
        } catch (err: any) {
            console.error(err);
            if (err?.body?.error?.status === 401 || err?.statusCode === 401 || err.message.includes('401')) {
                setError('Access Token expired. Please log in again.');
            } else {
                setError('Failed to generate playlist. Check console for details.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <Music className="w-6 h-6 text-indigo-500" />
                <h2 className="text-xl font-semibold text-white">Music Sync</h2>
            </div>

            {!session ? (
                <button
                    onClick={() => signIn('spotify')}
                    className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-3 rounded transition flex items-center justify-center gap-2"
                >
                    <LogIn className="w-5 h-5" />
                    Login with Spotify
                </button>
            ) : (
                <div className="space-y-4">
                    <div className="text-sm text-zinc-400">
                        Logged in as <span className="text-white font-medium">{session.user?.name}</span>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Genre</label>
                        <select
                            value={genre}
                            onChange={(e) => setGenre(e.target.value)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                        >
                            <option value="Rock">Rock</option>
                            <option value="Pop">Pop</option>
                            <option value="Electronic">Electronic</option>
                            <option value="Hip Hop">Hip Hop</option>
                            <option value="Classical">Classical</option>
                            <option value="Metal">Metal</option>
                        </select>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-medium py-2 rounded transition flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate AI Playlist'}
                    </button>

                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {playlist.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-green-400 text-sm">
                                <CheckCircle className="w-4 h-4" />
                                Playlist Generated ({playlist.length} songs)
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
                                {playlist.map((track, i) => (
                                    <div key={i} className="text-xs text-zinc-400 flex justify-between items-center p-1 hover:bg-zinc-800 rounded">
                                        <span className="truncate w-2/3">{track.name} - {track.artist}</span>
                                        <span className="text-zinc-600">{Math.floor(track.duration_ms / 60000)}:{((track.duration_ms % 60000) / 1000).toFixed(0).padStart(2, '0')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {accessToken && <SpotifyPlayer accessToken={accessToken} />}
                </div>
            )}
        </div>
    );
}
