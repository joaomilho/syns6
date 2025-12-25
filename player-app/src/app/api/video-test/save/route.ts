import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// This route requires PRODUCTION database
const PROD_DB_URL = process.env.DATABASE_URL;

if (!PROD_DB_URL || PROD_DB_URL.includes("localhost")) {
  console.error("❌ VIDEO TEST: DATABASE_URL must be set to PRODUCTION database!");
}

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  // Safety check - require production database
  if (!PROD_DB_URL || PROD_DB_URL.includes("localhost")) {
    return NextResponse.json(
      { error: "This endpoint requires PRODUCTION DATABASE_URL to be set" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { spotifyId, title, artist, workingYoutubeId } = body;

    if (!spotifyId || !title || !artist || !workingYoutubeId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Upsert the YouTube video record
    const result = await prisma.youTubeVideo.upsert({
      where: { spotifyId },
      update: {
        workingYoutubeId,
        verifiedAt: new Date(),
        source: "manual",
      },
      create: {
        spotifyId,
        title,
        artist,
        youtubeId: workingYoutubeId, // Use the working ID as the main ID too
        workingYoutubeId,
        verifiedAt: new Date(),
        source: "manual",
      },
    });

    console.log(`✅ Saved workingYoutubeId for "${title}" by ${artist}: ${workingYoutubeId}`);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Error saving video:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save video" },
      { status: 500 }
    );
  }
}

