import NextAuth, { NextAuthOptions } from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { Resend } from "resend";
import { email } from "@/emails/welcome";

// All valid Spotify authorization scopes
const SPOTIFY_SCOPES = [
  // Spotify Connect
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  
  // Users (required for auth)
  "user-read-email",
  "user-read-private",
].join(" ");

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  debug: process.env.NODE_ENV === 'development', // Enable debug logging
  logger: {
    error: (code, metadata) => {
      console.error("❌ NextAuth Error:", code, metadata);
    },
    warn: (code) => {
      console.warn("⚠️ NextAuth Warning:", code);
    },
    debug: (code, metadata) => {
      console.log("🔍 NextAuth Debug:", code, metadata);
    },
  },
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: SPOTIFY_SCOPES,
          show_dialog: true, // Force re-auth to get fresh tokens with correct scopes
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("🔐 SignIn callback:", { 
        userId: user?.id, 
        email: user?.email,
        provider: account?.provider,
        profileEmail: (profile as any)?.email,
      });
      return true; // Allow sign in
    },
    async session({ session, user }) {
      // With database sessions, we need to get tokens from the database
      if (user) {
        session.user.id = user.id;
        
        // Get Spotify account with tokens
        const account = await prisma.account.findFirst({
          where: {
            userId: user.id,
            provider: "spotify",
          },
        });

        if (account) {
          // Check if token needs refresh (with 5 minute buffer)
          const now = Math.floor(Date.now() / 1000);
          const expiresAt = account.expires_at || 0;
          const bufferSeconds = 5 * 60; // Refresh 5 minutes before expiration

          if (now >= expiresAt - bufferSeconds) {
            // Token expired or about to expire, refresh it
            console.log("🔄 Token expired or expiring soon, refreshing...");
            try {
              const response = await fetch("https://accounts.spotify.com/api/token", {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                  Authorization: `Basic ${Buffer.from(
                    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
                  ).toString("base64")}`,
                },
                body: new URLSearchParams({
                  grant_type: "refresh_token",
                  refresh_token: account.refresh_token!,
                }),
              });

              const refreshedTokens = await response.json();

              if (response.ok) {
                console.log("✅ Token refreshed successfully");
                
                // Update tokens in database
                await prisma.account.update({
                  where: { id: account.id },
                  data: {
                    access_token: refreshedTokens.access_token,
                    expires_at: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
                    refresh_token: refreshedTokens.refresh_token ?? account.refresh_token,
                  },
                });

                session.accessToken = refreshedTokens.access_token;
                session.refreshToken = refreshedTokens.refresh_token ?? account.refresh_token!;
                session.expiresAt = Math.floor(Date.now() / 1000 + refreshedTokens.expires_in);
              } else {
                console.error("❌ Failed to refresh token");
                session.error = "RefreshAccessTokenError";
              }
            } catch (error) {
              console.error("❌ Error refreshing token:", error);
              session.error = "RefreshAccessTokenError";
            }
          } else {
            // Token still valid
            session.accessToken = account.access_token!;
            session.refreshToken = account.refresh_token!;
            session.expiresAt = account.expires_at!;
          }
        }
      }
      
      return session;
    },
  },
  // Store sessions in database
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  events: {
    async createUser({ user }) {
      console.log("🆕 New user created:", user.id, user.email);
      if(!user.email) return;
      // Send welcome email when a new user signs up
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      try {
        await resend.emails.send({
          from: email.from,
          to: user.email,
          subject: email.subject,
          html: email.html,
        });
        console.log("✅ Welcome email sent for new user:", user.email);
      } catch (error) {
        console.error("❌ Failed to send welcome email:", error);
        // Don't throw - let user creation succeed even if email fails
      }
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
