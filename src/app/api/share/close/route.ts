import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/share/close
 * Close and delete a shared session (host only)
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
    
    // Delete the session
    await prisma.sharedSession.delete({
      where: { code },
    });
    
    console.log(`[Share] Session ${code} closed by host`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error closing shared session:", error);
    return NextResponse.json(
      { error: "Failed to close session" },
      { status: 500 }
    );
  }
}

