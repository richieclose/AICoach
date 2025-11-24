import SpotifyWebApi from 'spotify-web-api-node';

export const spotifyApi = new SpotifyWebApi({
    clientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
});

export const setAccessToken = (token: string) => {
    spotifyApi.setAccessToken(token);
};
