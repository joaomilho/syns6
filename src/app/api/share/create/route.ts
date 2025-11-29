import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/share/create
 * Create a new shared session with a 6-digit code
 */
export async function POST() {
  try {
    // Generate a unique 6-digit code
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Check if code already exists
      const existing = await prisma.sharedSession.findUnique({
        where: { code },
      });
      
      if (!existing) {
        // Create the session
        const session = await prisma.sharedSession.create({
          data: {
            code,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            connectedClients: 0,
          },
        });
        
        return NextResponse.json({
          code: session.code,
          sessionId: session.id,
        });
      }
      
      attempts++;
    }
    
    return NextResponse.json(
      { error: "Failed to generate unique code" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error creating shared session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

