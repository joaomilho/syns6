import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Get all lyrics from the database
//   const allLyrics = await prisma.lyrics.findMany({
//     select: {
//       spotifyId: true,
//       title: true,
//       artist: true,
//     },
//   });

//   console.log(`📊 Found ${allLyrics.length} songs with lyrics in database`);
//   console.log('\n🎬 You can manually add YouTube videos for these songs:\n');

  // Print songs for manual matching
//   allLyrics.forEach((song, index) => {
//     console.log(`${index + 1}. "${song.title}" by ${song.artist}`);
//     console.log(`   Spotify ID: ${song.spotifyId}`);
//     console.log(`   Add video with: await prisma.youTubeVideo.create({`);
//     console.log(`     data: {`);
//     console.log(`       spotifyId: "${song.spotifyId}",`);
//     console.log(`       title: "${song.title}",`);
//     console.log(`       artist: "${song.artist}",`);
//     console.log(`       youtubeId: "YOUR_YOUTUBE_ID_HERE",`);
//     console.log(`     }`);
//     console.log(`   })\n`);
//   });

  // Example: Seed a few default videos
  // Uncomment and modify these examples to add your manual mappings
  
//   /*
  await prisma.youTubeVideo.upsert({
    where: { spotifyId: '3kRf43EgjlDAGt2TQ7M459' },
    update: {},
    create: {
      spotifyId: '3kRf43EgjlDAGt2TQ7M459',
      title: 'One Of Us Is The Killer',
      artist: 'The Dillinger Escape Plan 1',
      youtubeId: 'd-FKM3eZTO8',
    },
  });

  await prisma.youTubeVideo.upsert({
    where: { spotifyId: '7d8u78sSmLggpjU9tk0o2J' },
    update: {},
    create: {
      spotifyId: '7d8u78sSmLggpjU9tk0o2J',
      title: 'One Of Us Is The Killer',
      artist: 'The Dillinger Escape Plan 1',
      youtubeId: 'd-FKM3eZTO8',
    },
  });
  

//   await prisma.youTubeVideo.upsert({
//     where: { spotifyId: 'SPOTIFY_ID_2' },
//     update: {},
//     create: {
//       spotifyId: 'SPOTIFY_ID_2',
//       title: 'Song Title 2',
//       artist: 'Artist Name 2',
//       youtubeId: 'YOUTUBE_ID_2',
//     },
//   });
//   */

  console.log('✅ Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

