/**
 * Shared Spotify OAuth utilities for all scripts
 * 
 * Handles user authorization via OAuth 2.0 flow
 */

import * as http from 'http';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const TOKEN_CACHE_FILE = path.join(process.cwd(), '.spotify-token-cache.json');

interface TokenCache {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Load environment variables from .env or .env.local
export function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  
  for (const envFile of envFiles) {
    const envPath = path.join(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf-8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const match = trimmed.match(/^([^=]+)=(.*)$/);
          if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      }
      console.log(`📄 Loaded environment from ${envFile}\n`);
    }
  }
}

// Load cached token if available and not expired
function loadCachedToken(): TokenCache | null {
  try {
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      const cache: TokenCache = JSON.parse(fs.readFileSync(TOKEN_CACHE_FILE, 'utf-8'));
      
      // Check if token is still valid (with 5 min buffer)
      if (cache.expiresAt > Date.now() + 300000) {
        return cache;
      }
    }
  } catch (error) {
    // Ignore cache errors
  }
  return null;
}

// Save token to cache
function saveTokenCache(cache: TokenCache) {
  try {
    fs.writeFileSync(TOKEN_CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (error) {
    console.warn('⚠️  Could not save token cache:', error);
  }
}

// Refresh access token using refresh token
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET required');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  const data = await response.json();
  
  // Save new token
  const cache: TokenCache = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken, // Use new or keep old
    expiresAt: Date.now() + (data.expires_in * 1000),
  };
  saveTokenCache(cache);
  
  return data.access_token;
}

// Get user access token via OAuth (with caching and refresh)
async function performOAuthFlow(scopes: string[]): Promise<{ accessToken: string; refreshToken: string }> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set in .env.local');
  }

  return new Promise((resolve, reject) => {
    const state = crypto.randomBytes(16).toString('hex');
    let authCode: string | null = null;

    // Create temporary HTTP server to receive callback
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url!, `http://127.0.0.1:${PORT}`);

      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code');
        const returnedState = url.searchParams.get('state');

        if (returnedState !== state) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Error: State mismatch</h1>');
          server.close();
          reject(new Error('State mismatch'));
          return;
        }

        if (code) {
          authCode = code;
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>✅ Success!</h1><p>You can close this window and return to the terminal.</p>');
          server.close();

          try {
            // Exchange code for access token
            const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
              },
              body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: authCode,
                redirect_uri: REDIRECT_URI,
              }),
            });

            if (!tokenResponse.ok) {
              const error = await tokenResponse.text();
              reject(new Error(`Failed to get token: ${error}`));
              return;
            }

            const data = await tokenResponse.json();
            
            // Save to cache
            const cache: TokenCache = {
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              expiresAt: Date.now() + (data.expires_in * 1000),
            };
            saveTokenCache(cache);
            
            resolve({
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
            });
          } catch (error) {
            reject(error);
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<h1>Error: No code received</h1>');
          server.close();
          reject(new Error('No authorization code received'));
        }
      }
    });

    server.listen(PORT, '127.0.0.1', () => {
      const authUrl = `https://accounts.spotify.com/authorize?${new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        state: state,
        scope: scopes.join(' '),
      })}`;

      console.log('🔐 Opening Spotify authorization in your browser...');
      console.log('\n📋 If it doesn\'t open automatically, visit this URL:');
      console.log(`\n${authUrl}\n`);

      // Try to open browser automatically
      const open = (url: string) => {
        const { exec } = require('child_process');
        const command = process.platform === 'darwin' ? 'open' :
                       process.platform === 'win32' ? 'start' : 'xdg-open';
        exec(`${command} "${url}"`);
      };

      try {
        open(authUrl);
      } catch (err) {
        console.log('⚠️  Could not open browser automatically. Please open the URL above manually.');
      }

      console.log('⏳ Waiting for authorization...\n');
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      if (!authCode) {
        server.close();
        reject(new Error('Authorization timeout'));
      }
    }, 300000);
  });
}

/**
 * Get a valid Spotify access token (with caching and auto-refresh)
 * 
 * @param scopes - Array of Spotify API scopes needed
 * @param forceNew - Force new OAuth flow even if cached token exists
 */
export async function getSpotifyAccessToken(
  scopes: string[] = ['user-library-read', 'playlist-read-private', 'playlist-read-collaborative'],
  forceNew: boolean = false
): Promise<string> {
  // Try to use cached token
  if (!forceNew) {
    const cached = loadCachedToken();
    if (cached) {
      console.log('✅ Using cached Spotify token\n');
      return cached.accessToken;
    }
  }

  // Try to refresh if we have a refresh token
  const oldCache = loadCachedToken();
  if (!forceNew && oldCache && oldCache.refreshToken) {
    try {
      console.log('🔄 Refreshing Spotify token...\n');
      return await refreshAccessToken(oldCache.refreshToken);
    } catch (error) {
      console.log('⚠️  Could not refresh token, requesting new authorization...\n');
    }
  }

  // Perform full OAuth flow
  const tokens = await performOAuthFlow(scopes);
  return tokens.accessToken;
}

/**
 * Clear cached token (useful for testing or forcing re-auth)
 */
export function clearTokenCache() {
  try {
    if (fs.existsSync(TOKEN_CACHE_FILE)) {
      fs.unlinkSync(TOKEN_CACHE_FILE);
      console.log('🗑️  Cleared token cache');
    }
  } catch (error) {
    console.warn('⚠️  Could not clear token cache:', error);
  }
}

