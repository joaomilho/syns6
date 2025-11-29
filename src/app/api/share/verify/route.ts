import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/share/verify?code=123456
 * Verify if a session code exists and is valid
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
        { exists: false, error: "Session not found" },
        { status: 200 }
      );
    }
    
    // Check if session has expired
    if (session.expiresAt < new Date()) {
      return NextResponse.json(
        { exists: false, error: "Session has expired" },
        { status: 200 }
      );
    }
    
    return NextResponse.json({
      exists: true,
      code: session.code,
      connectedClients: session.connectedClients,
    });
  } catch (error) {
    console.error("Error verifying shared session:", error);
    return NextResponse.json(
      { error: "Failed to verify session" },
      { status: 500 }
    );
  }
}

