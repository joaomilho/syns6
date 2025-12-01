import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/share/update
 * Update shared session state (host only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      code,
      trackId,
      trackName,
      artistName,
      albumArt,
      duration,
      progress,
      isPlaying,
      queue,
      lyrics,
      visualizationType,
      visualizationMode,
    } = body;
    
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
      console.log(`[Share] Session ${code} inactive for 30+ minutes, cannot update`);
      return NextResponse.json(
        { error: "Session expired due to inactivity" },
        { status: 410 }
      );
    }
    
    // Update the session and lastActivity if clients are connected
    const updatedSession = await prisma.sharedSession.update({
      where: { code },
      data: {
        trackId,
        trackName,
        artistName,
        albumArt,
        duration,
        progress,
        isPlaying: isPlaying ?? false,
        queue: queue ? JSON.stringify(queue) : null,
        lyrics: lyrics ? JSON.stringify(lyrics) : null,
        visualizationType,
        visualizationMode,
        lastUpdate: new Date(),
        // Update lastActivity if there are connected clients
        ...(session.connectedClients > 0 && { lastActivity: new Date() }),
      },
    });
    
    return NextResponse.json({
      success: true,
      connectedClients: updatedSession.connectedClients,
    });
  } catch (error) {
    console.error("Error updating shared session:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}

