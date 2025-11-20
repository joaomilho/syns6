import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed YouTube videos based on existing lyrics in the database
 * 
 * To use:
 * 1. Get lyrics from DB: SELECT spotifyId, title, artist FROM lyrics LIMIT 50;
 * 2. Manually find YouTube videos for each song
 * 3. Add them to the `videos` array below
 * 4. Run: npx tsx prisma/seeds/youtube_videos.ts
 */

const videos = [
  // Example format - replace with your actual data:
  // {
  //   spotifyId: '3n3Ppam7vgaVa1iaRUc9Lp', // Spotify track ID
  //   title: 'Mr. Brightside',
  //   artist: 'The Killers',
  //   youtubeId: 'gGdGFtwCNBE', // Just the video ID, not full URL
  //   source: 'manual',
  // },
  
  // TODO: Add your manually curated videos here
];

async function main() {
  console.log('🌱 Seeding YouTube videos...');

  for (const video of videos) {
    try {
      await prisma.youTubeVideo.upsert({
        where: { spotifyId: video.spotifyId },
        create: video,
        update: {
          youtubeId: video.youtubeId,
          source: video.source,
        },
      });
      console.log(`✅ Added: ${video.title} by ${video.artist} → ${video.youtubeId}`);
    } catch (error) {
      console.error(`❌ Failed to add ${video.title}:`, error);
    }
  }

  console.log('✨ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

