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

export function useYouTubePreloader(queue: QueueTrack[], currentTrackId?: string, enabled: boolean = true) {
  const testingRef = useRef<TestingVideo | null>(null);
  const testedTracksRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<QueueTrack[]>([]);

  // Update queue ref
  useEffect(() => {
    if (!enabled) return;
    queueRef.current = queue;
  }, [queue, currentTrackId, enabled]);

  // Background testing function
  const testNextVideo = () => {
    if (!testingRef.current) return;

    const testing = testingRef.current;
    const { videoIds, currentIndex, trackName } = testing;

    if (currentIndex >= videoIds.length) {
      console.log(`[YT Preloader] ❌ No working video for: ${trackName}`);
      cleanup();
      testNextTrack();
      return;
    }

    const videoId = videoIds[currentIndex];
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
        // Ignore cleanup errors
      }
      testingRef.current = null;
    }
  };

  const testNextTrack = async () => {
    cleanup();

    // Find next track to test
    const nextTrack = queueRef.current.find(track => {
      const isCurrent = track.id === currentTrackId;
      const alreadyTested = testedTracksRef.current.has(track.id);
      const hasVideoIds = track.videoIds && track.videoIds.length > 0;
      return !isCurrent && !alreadyTested && hasVideoIds;
    });

    if (!nextTrack || !nextTrack.videoIds) return;

    // Check if already cached
    const cached = await getWorkingVideo(nextTrack.id);
    if (cached) {
      testedTracksRef.current.add(nextTrack.id);
      setTimeout(testNextTrack, 100);
      return;
    }

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
          onError: () => {
            if (!testingRef.current || testingRef.current.spotifyId !== nextTrack.id) return;
            testingRef.current.currentIndex++;
            setTimeout(testNextVideo, 500);
          },
          onStateChange: (event: any) => {
            if (!testingRef.current || testingRef.current.spotifyId !== nextTrack.id) return;
            
            // YT.PlayerState.PLAYING = 1
            if (event.data === 1) {
              const workingVideoId = testingRef.current.videoIds[testingRef.current.currentIndex];
              console.log(`[YT Preloader] ✅ ${nextTrack.name}: ${workingVideoId}`);
              
              saveWorkingVideo(
                nextTrack.id,
                workingVideoId,
                testingRef.current.videoIds
              ).catch(() => {});
              
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

  // Start testing when queue updates (only if enabled)
  useEffect(() => {
    if (!enabled || testingRef.current) return;
    const timer = setTimeout(testNextTrack, 2000);
    return () => clearTimeout(timer);
  }, [queue, currentTrackId, enabled]);

  // Cleanup when disabled or on unmount
  useEffect(() => {
    if (!enabled) {
      cleanup();
    }
    return () => {
      cleanup();
    };
  }, [enabled]);

  return null;
}
