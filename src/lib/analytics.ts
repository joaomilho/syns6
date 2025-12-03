import { track } from '@vercel/analytics';

/**
 * Analytics tracking for syns6
 * Limited to 2 custom properties per event (Vercel Pro plan limit)
 * User email is always one property, leaving 1 for context
 */

export function trackSongPlay(userEmail: string | null | undefined, song: string) {
  track('Song Play', {
    user: userEmail || 'anonymous',
    song, // "Song Name - Artist"
  });
}

export function trackVisualizationChange(userEmail: string | null | undefined, visualization: string) {
  track('Visualization Change', {
    user: userEmail || 'anonymous',
    viz: visualization,
  });
}

export function trackConfigChange(userEmail: string | null | undefined, change: string) {
  track('Config Change', {
    user: userEmail || 'anonymous',
    change, // e.g. "font:Inter" or "color:#ff0" or "mode:RANDOM"
  });
}

export function trackCamToggle(userEmail: string | null | undefined, enabled: boolean) {
  track('Camera Toggle', {
    user: userEmail || 'anonymous',
    enabled: enabled ? 'on' : 'off',
  });
}

export function trackMicToggle(userEmail: string | null | undefined, enabled: boolean) {
  track('Mic Toggle', {
    user: userEmail || 'anonymous',
    enabled: enabled ? 'on' : 'off',
  });
}

export function trackAIClick(userEmail: string | null | undefined) {
  track('AI Click', {
    user: userEmail || 'anonymous',
  });
}

export function trackHueClick(userEmail: string | null | undefined) {
  track('Hue Click', {
    user: userEmail || 'anonymous',
  });
}

export function trackProfileClick(userEmail: string | null | undefined) {
  track('Profile Click', {
    user: userEmail || 'anonymous',
  });
}

export function trackShareClick(userEmail: string | null | undefined) {
  track('Share Click', {
    user: userEmail || 'anonymous',
  });
}

export function trackSubscribeOption(userEmail: string | null | undefined, plan: string) {
  track('Subscribe Option', {
    user: userEmail || 'anonymous',
    plan, // "weekly", "monthly", "yearly"
  });
}

