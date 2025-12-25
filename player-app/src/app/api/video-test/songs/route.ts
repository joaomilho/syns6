import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

// This route requires PRODUCTION database - throw if not set properly
const PROD_DB_URL = process.env.DATABASE_URL;

if (!PROD_DB_URL || PROD_DB_URL.includes("localhost")) {
  console.error("❌ VIDEO TEST: DATABASE_URL must be set to PRODUCTION database!");
}

const prisma = new PrismaClient();

export async function GET() {
  // Safety check - require production database
  if (!PROD_DB_URL || PROD_DB_URL.includes("localhost")) {
    return NextResponse.json(
      { error: "This endpoint requires PRODUCTION DATABASE_URL to be set" },
      { status: 500 }
    );
  }

  try {
    // Find all lyrics that don't have a corresponding YouTubeVideo with workingYoutubeId
    // Using raw SQL for the LEFT JOIN NOT EXISTS pattern
    const songsNeedingVideos = await prisma.$queryRaw<
      Array<{ spotifyId: string; title: string; artist: string }>
    >`
      SELECT l."spotifyId", l.title, l.artist
      FROM lyrics l
      LEFT JOIN youtube_videos yv ON l."spotifyId" = yv."spotifyId"
      WHERE yv."workingYoutubeId" IS NULL
         OR yv."spotifyId" IS NULL
      ORDER BY l."accessCount" DESC
      LIMIT 500
    `;

    return NextResponse.json({
      songs: songsNeedingVideos,
      total: songsNeedingVideos.length,
    });
  } catch (error: any) {
    console.error("Error fetching songs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch songs" },
      { status: 500 }
    );
  }
}

