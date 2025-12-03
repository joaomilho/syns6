import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Force refresh the Spotify access token
 * Call this when you get a 401 from Spotify API
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    // Get the account from database
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "spotify",
      },
    });

    if (!account?.refresh_token) {
      return NextResponse.json({ error: "No refresh token" }, { status: 400 });
    }

    console.log("🔄 Force refreshing Spotify token...");

    // Refresh the token
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
        refresh_token: account.refresh_token,
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      console.error("❌ Failed to refresh token:", refreshedTokens);
      return NextResponse.json(
        { error: "Failed to refresh token", details: refreshedTokens },
        { status: 500 }
      );
    }

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

    return NextResponse.json({
      accessToken: refreshedTokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000 + refreshedTokens.expires_in),
    });
  } catch (error) {
    console.error("❌ Error refreshing token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

