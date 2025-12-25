import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * POST endpoint to report a working YouTube video ID from the frontend
 * This creates a crowdsourced cache of verified working videos
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spotifyId, workingVideoId, title, artist } = body;

    console.log("[YouTube Report] 📥 Received working video report:", {
      spotifyId,
      workingVideoId,
      title,
      artist
    });

    // Validate required fields
    if (!spotifyId || !workingVideoId) {
      console.error("[YouTube Report] ❌ Missing required fields");
      return NextResponse.json(
        { error: "spotifyId and workingVideoId are required" },
        { status: 400 }
      );
    }

    // Don't save the default fallback video
    const DEFAULT_VIDEO_ID = "L1vrPpM4eyM";
    if (workingVideoId === DEFAULT_VIDEO_ID) {
      console.log("[YouTube Report] ⚠️ Skipping default fallback video");
      return NextResponse.json({ 
        success: true, 
        message: "Skipped default fallback video" 
      });
    }

    // Update or create the database entry with the working video ID
    const video = await prisma.youTubeVideo.upsert({
      where: { spotifyId },
      create: {
        spotifyId,
        title: title || "Unknown",
        artist: artist || "Unknown",
        youtubeId: workingVideoId, // Save single working ID
        workingYoutubeId: workingVideoId,
        verifiedAt: new Date(),
        source: "frontend-verified",
      },
      update: {
        workingYoutubeId: workingVideoId,
        verifiedAt: new Date(),
      },
    });

    console.log("[YouTube Report] ✅ Saved working video:", {
      spotifyId,
      workingVideoId,
      dbId: video.id
    });

    return NextResponse.json({ 
      success: true,
      message: "Working video ID saved successfully" 
    });
  } catch (error) {
    console.error("[YouTube Report] ❌ Error saving working video:", error);
    return NextResponse.json(
      { error: "Failed to save working video ID" },
      { status: 500 }
    );
  }
}

