import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/share/disconnect
 * Disconnect from a shared session and decrement connected clients
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
      // Session doesn't exist, that's fine
      return NextResponse.json({ success: true });
    }
    
    // Decrement connected clients (but not below 0)
    // Update lastActivity when disconnecting (starts the 30min inactivity timer)
    await prisma.sharedSession.update({
      where: { code },
      data: {
        connectedClients: Math.max(0, session.connectedClients - 1),
        lastActivity: new Date(),
      },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting from shared session:", error);
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }
}

