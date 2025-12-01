/**
 * Hook to preload and test YouTube videos in the background for queued tracks
 * Tests videos while other songs are playing to have instant playback later
 */

import { useEffect, useRef } from 'react';
import { getWorkingVideo, saveWorkingVideo } from '@/lib/storage';

interface QueueTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  videoIds?: string[];
}

interface TestingVideo {
  spotifyId: string;
  trackName: string;
  artistName: string;
  videoIds: string[];
  currentIndex: number;
  player: any;
  container: HTMLDivElement;
}

export function useYouTubePreloader(queue: QueueTrack[], currentTrackId?: string) {
  const testingRef = useRef<TestingVideo | null>(null);
  const testedTracksRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<QueueTrack[]>([]);

  // Update queue ref
  useEffect(() => {
    console.log(`[Preloader] 📋 Queue updated:`, {
      totalTracks: queue.length,
      tracksWithVideoIds: queue.filter(t => t.videoIds && t.videoIds.length > 0).length,
      currentTrackId,
    });
    queue.forEach((track, i) => {
      console.log(`[Preloader]   ${i + 1}. ${track.name} - videoIds: ${track.videoIds?.length || 0}`);
    });
    queueRef.current = queue;
  }, [queue, currentTrackId]);

  // Background testing function
  const testNextVideo = () => {
    if (!testingRef.current) return;

    const testing = testingRef.current;
    const { spotifyId, videoIds, currentIndex, trackName } = testing;

    if (currentIndex >= videoIds.length) {
      // All videos failed for this track
      console.log(`[Preloader] ❌ All videos failed for: ${trackName}`);
      cleanup();
      testNextTrack();
      return;
    }

    const videoId = videoIds[currentIndex];
    console.log(`[Preloader] 🧪 Testing video ${currentIndex + 1}/${videoIds.length} for: ${trackName} (${videoId})`);

    // Load this video
    if (testing.player && typeof testing.player.loadVideoById === 'function') {
      testing.player.loadVideoById(videoId);
    }
  };

  const cleanup = () => {
    if (testingRef.current) {
      try {
        testingRef.current.player?.destroy();
        testingRef.current.container?.remove();
      } catch (e) {
        console.warn('[Preloader] Cleanup error:', e);
      }
      testingRef.current = null;
    }
  };

  const testNextTrack = async () => {
    console.log('[Preloader] 🔍 Looking for next track to test...');
    console.log('[Preloader]   Queue size:', queueRef.current.length);
    console.log('[Preloader]   Current track:', currentTrackId);
    console.log('[Preloader]   Already tested:', Array.from(testedTracksRef.current));
    
    // Clean up previous test
    cleanup();

    // Find next track to test
    const nextTrack = queueRef.current.find(track => {
      const isCurrent = track.id === currentTrackId;
      const alreadyTested = testedTracksRef.current.has(track.id);
      const hasVideoIds = track.videoIds && track.videoIds.length > 0;
      
      console.log(`[Preloader]   Checking: ${track.name} - current:${isCurrent}, tested:${alreadyTested}, hasIds:${hasVideoIds}`);
      
      // Skip current track, already tested tracks, and tracks without video IDs
      return !isCurrent && !alreadyTested && hasVideoIds;
    });

    if (!nextTrack || !nextTrack.videoIds) {
      console.log('[Preloader] 💤 No more tracks to test');
      return;
    }
    
    console.log(`[Preloader] 🎯 Found track to test: ${nextTrack.name} (${nextTrack.videoIds.length} videos)`);

    // Check if already cached
    const cached = await getWorkingVideo(nextTrack.id);
    if (cached) {
      console.log(`[Preloader] ✅ Track already has cached video: ${nextTrack.name}`);
      testedTracksRef.current.add(nextTrack.id);
      // Continue to next track
      setTimeout(testNextTrack, 100);
      return;
    }

    console.log(`[Preloader] 🚀 Starting background test for: ${nextTrack.name}`);
    testedTracksRef.current.add(nextTrack.id);

    // Wait for YouTube API
    const waitForAPI = () => {
      if (!(window as any).YT || !(window as any).YT.Player) {
        setTimeout(waitForAPI, 100);
        return;
      }

      // Create hidden container
      const container = document.createElement('div');
      container.id = `preloader-${nextTrack.id}`;
      container.style.position = 'fixed';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '1px';
      container.style.height = '1px';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);

      const player = new (window as any).YT.Player(container.id, {
        height: '1',
        width: '1',
        videoId: nextTrack.videoIds![0],
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
        },
        events: {
          onError: (event: any) => {
            if (!testingRef.current || testingRef.current.spotifyId !== nextTrack.id) return;
            
            console.log(`[Preloader] ❌ Video error for ${nextTrack.name}:`, event.data);
            
            // Try next video
            testingRef.current.currentIndex++;
            setTimeout(testNextVideo, 500);
          },
          onStateChange: (event: any) => {
            if (!testingRef.current || testingRef.current.spotifyId !== nextTrack.id) return;
            
            // YT.PlayerState.PLAYING = 1
            if (event.data === 1) {
              const workingVideoId = testingRef.current.videoIds[testingRef.current.currentIndex];
              console.log(`[Preloader] ✅ Working video found for ${nextTrack.name}: ${workingVideoId}`);
              
              // Save to IndexedDB
              saveWorkingVideo(
                nextTrack.id,
                workingVideoId,
                testingRef.current.videoIds
              ).catch(err => console.error('[Preloader] Save error:', err));
              
              // Clean up and move to next track
              cleanup();
              setTimeout(testNextTrack, 1000);
            }
          },
        },
      });

      testingRef.current = {
        spotifyId: nextTrack.id,
        trackName: nextTrack.name,
        artistName: nextTrack.artists[0]?.name || 'Unknown',
        videoIds: nextTrack.videoIds!,
        currentIndex: 0,
        player,
        container,
      };
    };

    waitForAPI();
  };

  // Start testing when queue updates
  useEffect(() => {
    // Don't start if already testing
    if (testingRef.current) return;

    // Start testing first eligible track
    const timer = setTimeout(testNextTrack, 2000); // Wait 2s before starting
    return () => clearTimeout(timer);
  }, [queue, currentTrackId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return null;
}

