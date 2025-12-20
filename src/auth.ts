import NextAuth, { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { Resend } from "resend";
import { email } from "@/emails/welcome";

/**
 * Auth configuration
 * 
 * Note: Spotify OAuth provider has been removed since the app now uses 
 * osascript via Tauri to communicate with the local Spotify app directly.
 * 
 * Add a new auth provider here if needed (e.g., Google, GitHub, Email).
 */
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  debug: process.env.NODE_ENV === 'development',
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
    // No auth providers configured - app is desktop-only via Tauri
    // Add providers here if auth is needed in the future
  ],
  callbacks: {
    async signIn({ user }) {
      console.log("🔐 SignIn callback:", { 
        userId: user?.id, 
        email: user?.email,
      });
      return true;
    },
    async session({ session, user }) {
      if (user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  events: {
    async createUser({ user }) {
      console.log("🆕 New user created:", user.id, user.email);
      if (!user.email) return;
      
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
      }
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
