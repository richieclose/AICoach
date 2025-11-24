import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

interface WorkoutInterval {
    id: string;
    duration: number; // seconds
    type: 'warmup' | 'active' | 'recovery' | 'cooldown';
    targetPower: number;
}

interface SongSuggestion {
    artist: string;
    track: string;
}

interface PlaylistTrack {
    id: string;
    uri: string;
    name: string;
    artist: string;
    albumArt: string;
    duration_ms: number;
    intervalId: string;
}

/**
 * Get intensity description for an interval type
 */
function getIntensityDescription(intervalType: string): string {
    const descriptions: Record<string, string> = {
        warmup: 'Low to medium energy, building up gradually. BPM: 100-120',
        active: 'High energy, intense, fast-paced. BPM: 140-180',
        recovery: 'Lower energy, relaxing, slower tempo to bring heart rate down. BPM: 90-110',
        cooldown: 'Very low energy, calm, relaxing. BPM: 70-100'
    };
    return descriptions[intervalType] || descriptions['active'];
}

/**
 * Ask Gemini to suggest specific songs for an interval
 */
async function getSongSuggestionsFromGemini(
    genre: string,
    intervalType: string,
    songsNeeded: number
): Promise<SongSuggestion[]> {
    const intensity = getIntensityDescription(intervalType);

    const prompt = `You are a professional DJ for cycling workouts.
I need a playlist for a ${intervalType} interval.
Genre: ${genre}
Intensity: ${intensity}

Suggest ${songsNeeded} specific, well-known songs that match this vibe.
Choose popular songs that are likely to be available on Spotify.

Output ONLY a valid JSON array (no markdown, no code blocks):
[
  {"artist": "Artist Name", "track": "Track Title"},
  {"artist": "Artist Name", "track": "Track Title"}
]`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text()
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

        const suggestions = JSON.parse(text);
        console.log(`Gemini suggested ${suggestions.length} songs for ${intervalType}:`, suggestions);
        return suggestions;
    } catch (error) {
        console.error('Gemini Error:', error);
        return [];
    }
}

/**
 * Search Spotify for a specific song
 */
async function searchSpotifyForTrack(
    artist: string,
    track: string,
    accessToken: string
): Promise<any | null> {
    try {
        const query = `artist:${artist} track:${track}`;
        const params = new URLSearchParams({
            q: query,
            type: 'track',
            limit: '1'
        });

        const url = `https://api.spotify.com/v1/search?${params.toString()}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            console.error(`Spotify Search Error (${response.status}) for "${artist} - ${track}"`);
            return null;
        }

        const data = await response.json();
        const tracks = data.tracks?.items || [];

        if (tracks.length > 0) {
            console.log(`Found: ${tracks[0].name} by ${tracks[0].artists[0].name}`);
            return tracks[0];
        } else {
            console.warn(`No results found for "${artist} - ${track}"`);
            return null;
        }
    } catch (err) {
        console.error(`Error searching for "${artist} - ${track}":`, err);
        return null;
    }
}

/**
 * Generate a playlist for a workout using Gemini + Spotify Search
 */
export async function generatePlaylistForWorkout(
    workout: { intervals: WorkoutInterval[] },
    genre: string,
    accessToken: string
): Promise<PlaylistTrack[]> {
    const cleanToken = accessToken.replace(/"/g, '').trim();

    // Validate token first
    try {
        const meRes = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${cleanToken}` }
        });
        if (!meRes.ok) {
            const errText = await meRes.text();
            console.error('Token Validation Failed:', meRes.status, errText);
            throw new Error(`Invalid Spotify Token (${meRes.status}). Please get a new one.`);
        }
    } catch (e) {
        throw e;
    }

    const playlist: PlaylistTrack[] = [];

    // For each interval, get song suggestions from Gemini and search Spotify
    for (const interval of workout.intervals) {
        // Calculate how many songs we need (assuming ~3.5 mins per song)
        const songsNeeded = Math.ceil(interval.duration / 210);

        console.log(`\nGenerating ${songsNeeded} songs for ${interval.type} interval (${interval.duration}s)`);

        // Get suggestions from Gemini
        const suggestions = await getSongSuggestionsFromGemini(
            genre,
            interval.type,
            songsNeeded + 2 // Request a few extra in case some aren't found
        );

        // Search Spotify for each suggested song
        let currentDuration = 0;
        for (const suggestion of suggestions) {
            if (currentDuration >= interval.duration * 1000) {
                break; // We have enough songs for this interval
            }

            const spotifyTrack = await searchSpotifyForTrack(
                suggestion.artist,
                suggestion.track,
                cleanToken
            );

            if (spotifyTrack) {
                playlist.push({
                    id: spotifyTrack.id,
                    uri: spotifyTrack.uri,
                    name: spotifyTrack.name,
                    artist: spotifyTrack.artists[0].name,
                    albumArt: spotifyTrack.album.images[0]?.url || '',
                    duration_ms: spotifyTrack.duration_ms,
                    intervalId: interval.id
                });
                currentDuration += spotifyTrack.duration_ms;
            }
        }

        console.log(`Added ${playlist.filter(t => t.intervalId === interval.id).length} tracks for ${interval.type}`);
    }

    console.log(`\nTotal playlist: ${playlist.length} tracks`);
    return playlist;
}
