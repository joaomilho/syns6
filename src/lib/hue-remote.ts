/**
 * Philips Hue Remote API Integration (OAuth)
 * For production HTTPS access via Hue cloud
 */

export interface HueRemoteAuthConfig {
  clientId: string;
  clientSecret: string;
  appId: string;
}

export interface HueRemoteTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
  username: string; // Hue username from remote API
}

// Detect if we should use local or remote API
export function shouldUseRemoteAPI(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  
  // Use local API for:
  // - localhost
  // - 127.x.x.x
  // - 192.168.x.x (private network)
  // - 10.x.x.x (private network)
  // - 172.16-31.x.x (private network)
  const isLocal = 
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('127.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);
  
  // Use remote API for everything else (production domains)
  return !isLocal;
}

/**
 * Get OAuth authorization URL
 */
export function getHueAuthUrl(config: HueRemoteAuthConfig, state: string): string {
  const params = new URLSearchParams({
    clientid: config.clientId,
    appid: config.appId,
    deviceid: 'syns-karaoke',
    devicename: 'Syns Karaoke',
    state,
    response_type: 'code',
  });
  
  return `https://api.meethue.com/v2/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  config: HueRemoteAuthConfig,
  code: string
): Promise<HueRemoteTokens> {
  const response = await fetch('https://api.meethue.com/v2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
    }).toString(),
    // Note: Uses Basic Auth with clientId:clientSecret
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange code: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
    username: data.username || '',
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  config: HueRemoteAuthConfig,
  refreshToken: string
): Promise<HueRemoteTokens> {
  const response = await fetch('https://api.meethue.com/v2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString(),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.status}`);
  }

  const data = await response.json();
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
    username: data.username || '',
  };
}

/**
 * Get lights via Remote API
 */
export async function getRemoteLights(accessToken: string) {
  const response = await fetch('https://api.meethue.com/route/api/0/lights', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get lights: ${response.status}`);
  }

  return await response.json();
}

/**
 * Set light state via Remote API
 */
export async function setRemoteLightState(
  accessToken: string,
  lightId: string,
  state: {
    on?: boolean;
    bri?: number;
    hue?: number;
    sat?: number;
    transitiontime?: number;
  }
): Promise<void> {
  const response = await fetch(
    `https://api.meethue.com/route/api/0/lights/${lightId}/state`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(state),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update light: ${response.status}`);
  }

  const data = await response.json();
  
  // Same response format as local API
  if (!Array.isArray(data)) {
    throw new Error('Invalid Hue API response');
  }
  
  const successCount = data.filter((item: any) => item.success).length;
  const errorCount = data.filter((item: any) => item.error).length;
  
  if (errorCount > 0 && successCount === 0) {
    const firstError = data.find((item: any) => item.error)?.error;
    throw new Error(firstError?.description || 'All properties failed');
  }
}

