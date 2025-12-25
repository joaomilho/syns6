/**
 * Minimal storage utility for the site
 * Uses localStorage for microphone preference
 */

export async function getMicrophoneEnabled(): Promise<boolean | null> {
  if (typeof window === 'undefined') return null;
  try {
    const item = localStorage.getItem('syns_microphoneEnabled');
    if (item === null) return null;
    return item === 'true';
  } catch {
    return null;
  }
}

export async function saveMicrophoneEnabled(enabled: boolean): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('syns_microphoneEnabled', String(enabled));
  } catch {
    // Silently fail - storage not available
  }
}

