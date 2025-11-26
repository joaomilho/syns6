// Referral code utilities

/**
 * Generate a unique referral code
 */
export function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing characters
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Get referral URL for a given code
 */
export function getReferralUrl(code: string): string {
  // Auto-detect the base URL from window location if in browser
  if (typeof window !== 'undefined') {
    const baseUrl = `${window.location.protocol}//${window.location.host}`;
    return `${baseUrl}/?ref=${code}`;
  }
  
  // Fallback for server-side rendering
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://syns6.com';
  return `${baseUrl}/?ref=${code}`;
}

/**
 * Get social share URLs
 */
export function getSocialShareUrls(referralUrl: string) {
  const text = encodeURIComponent("I just joined the Syns6 waitlist for the coolest karaoke experience! 🎤 Join me and skip ahead:");
  
  return {
    twitter: `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(referralUrl)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`,
    whatsapp: `https://wa.me/?text=${text}%20${encodeURIComponent(referralUrl)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${text}`,
  };
}

/**
 * Share using native Web Share API (shows all installed apps including TikTok)
 */
export async function shareNative(referralUrl: string): Promise<boolean> {
  if (!navigator.share) {
    return false; // Not supported
  }

  try {
    await navigator.share({
      title: 'Join Syns6',
      text: 'I just joined the syns6.com waitlist for the coolest karaoke experience! 🎤 Join me and skip ahead:',
      url: referralUrl,
    });
    return true;
  } catch (error) {
    // User cancelled or error occurred
    console.log('Share cancelled or failed:', error);
    return false;
  }
}

