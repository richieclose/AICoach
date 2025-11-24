import NextAuth, { NextAuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "./db";

const scope = "streaming user-read-email user-read-private playlist-modify-public playlist-modify-private user-read-playback-state user-modify-playback-state user-read-currently-playing";

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        SpotifyProvider({
            clientId: process.env.SPOTIFY_CLIENT_ID || "",
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
            authorization: {
                params: { scope },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            // Initial sign in
            if (account) {
                return {
                    ...token,
                    accessToken: account.access_token,
                    refreshToken: account.refresh_token,
                    expiresAt: account.expires_at ? account.expires_at * 1000 : 0,
                };
            }
            // Return previous token if the access token has not expired yet
            if (Date.now() < (token.expiresAt as number)) {
                return token;
            }

            // Access token has expired, try to update it
            // For simplicity in this step, we might just force re-login or handle refresh later.
            // But ideally we'd implement refreshAccessToken(token) here.
            return token;
        },
        async session({ session, token }) {
            // Send properties to the client, like an access_token from a provider.
            // @ts-ignore
            session.accessToken = token.accessToken;
            // @ts-ignore
            session.error = token.error;
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
