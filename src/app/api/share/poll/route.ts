import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/share/poll?code=123456
 * Poll for shared session state
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    
    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Code is required" },
        { status: 400 }
      );
    }
    
    // Find the session
    const session = await prisma.sharedSession.findUnique({
      where: { code },
    });
    
    if (!session) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }
    
    // Check if session has expired
    if (session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Session has expired" },
        { status: 410 }
      );
    }
    
    // Check for 30-minute inactivity TTL (only if no clients connected)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    if (session.connectedClients === 0 && session.lastActivity < thirtyMinutesAgo) {
      console.log(`[Share] Session ${code} inactive for 30+ minutes, closing`);
      return NextResponse.json(
        { error: "Session expired due to inactivity" },
        { status: 410 }
      );
    }
    
    // Parse JSON fields
    let queue = null;
    let lyrics = null;
    
    try {
      if (session.queue) {
        queue = JSON.parse(session.queue);
      }
      if (session.lyrics) {
        lyrics = JSON.parse(session.lyrics);
      }
    } catch (err) {
      console.error("Error parsing session data:", err);
    }
    
    return NextResponse.json({
      trackId: session.trackId,
      trackName: session.trackName,
      artistName: session.artistName,
      albumArt: session.albumArt,
      duration: session.duration,
      progress: session.progress,
      isPlaying: session.isPlaying,
      queue,
      lyrics,
      visualizationType: session.visualizationType,
      visualizationMode: session.visualizationMode,
      connectedClients: session.connectedClients,
      lastUpdate: session.lastUpdate.toISOString(),
    });
  } catch (error) {
    console.error("Error polling shared session:", error);
    return NextResponse.json(
      { error: "Failed to poll session" },
      { status: 500 }
    );
  }
}

