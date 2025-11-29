import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/share/join
 * Join a shared session and increment connected clients
 */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    
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
    
    // Increment connected clients
    const updatedSession = await prisma.sharedSession.update({
      where: { code },
      data: {
        connectedClients: {
          increment: 1,
        },
      },
    });
    
    return NextResponse.json({
      sessionId: updatedSession.id,
      code: updatedSession.code,
      connectedClients: updatedSession.connectedClients,
    });
  } catch (error) {
    console.error("Error joining shared session:", error);
    return NextResponse.json(
      { error: "Failed to join session" },
      { status: 500 }
    );
  }
}

