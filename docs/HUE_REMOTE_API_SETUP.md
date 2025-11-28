# Hue Remote API Setup

## Why Remote API?

**Problem:** HTTPS pages can't call HTTP Hue bridges (mixed content)

**Solution:** Use Hue's Remote API (cloud-based, OAuth) for production

## Architecture

```
Development (localhost):
Browser (HTTP) → Local Hue Bridge (HTTP) ✅

Production (HTTPS):
Browser (HTTPS) → Hue Cloud API (HTTPS) → Your Hue Bridge ✅
```

## Setup Steps

### 1. Create Hue Developer Account

1. Go to https://developers.meethue.com/
2. Sign in with your Hue account
3. Go to "My Apps"
4. Create a new app

### 2. Get OAuth Credentials

Fill in:
- **App name**: Syns Karaoke
- **App description**: Music-reactive Hue lights for karaoke
- **Callback URL**: `https://yourdomain.com/player` (your player page)
- **App type**: OAuth

You'll receive:
- **App ID**: (long hex string)
- **Client ID**: (long hex string)
- **Client Secret**: (secret string - keep secure!)

### 3. Add to Environment Variables

```env
# .env.local (for testing)
NEXT_PUBLIC_HUE_CLIENT_ID=your_client_id_here
NEXT_PUBLIC_HUE_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_HUE_APP_ID=your_app_id_here
```

```env
# Vercel Environment Variables (production)
NEXT_PUBLIC_HUE_CLIENT_ID = [from Hue developer portal]
NEXT_PUBLIC_HUE_CLIENT_SECRET = [from Hue developer portal]
NEXT_PUBLIC_HUE_APP_ID = [from Hue developer portal]
```

### 4. Update Code

The code will automatically:
- ✅ Detect localhost → Use local API
- ✅ Detect production → Use remote API with OAuth

## User Flow

### Development (Localhost)

1. User opens Hue dropdown
2. Click "Discover"
3. Click "Connect" to bridge
4. Press button on bridge
5. ✅ Connected via local API

### Production (HTTPS)

1. User opens Hue dropdown
2. Shows: "Connect via Hue Account"
3. Click "Connect with Hue"
4. Redirected to Hue OAuth page
5. User logs in with Hue account
6. User authorizes app
7. Redirected back to your site
8. ✅ Connected via remote API
9. Token stored in localStorage

## OAuth Flow Details

```
1. User clicks "Connect with Hue"
   ↓
2. App generates state token (CSRF protection)
   ↓
3. Redirect to:
   https://api.meethue.com/v2/oauth2/authorize?
     clientid=XXX&
     appid=YYY&
     deviceid=syns-karaoke&
     state=ABC&
     response_type=code
   ↓
4. User authorizes on Hue's site
   ↓
5. Hue redirects back:
   https://yourdomain.com/player?code=ZZZ&state=ABC
   ↓
6. App exchanges code for tokens:
   POST https://api.meethue.com/v2/oauth2/token
   {
     code: ZZZ,
     grant_type: 'authorization_code'
   }
   ↓
7. Receive tokens:
   {
     access_token: "...",
     refresh_token: "...",
     expires_in: 604800  // 7 days
   }
   ↓
8. Store in localStorage
   ↓
9. Use for API calls:
   Authorization: Bearer [access_token]
```

## Token Management

### Storage

```typescript
interface HueRemoteTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  username: string;
}

localStorage.setItem('hue_remote_tokens', JSON.stringify(tokens));
```

### Refresh

Access tokens expire after 7 days. Auto-refresh:

```typescript
if (Date.now() > tokens.expiresAt - 3600000) { // 1 hour before expiry
  tokens = await refreshAccessToken(config, tokens.refreshToken);
  localStorage.setItem('hue_remote_tokens', JSON.stringify(tokens));
}
```

## API Endpoints

### Remote API Base

```
https://api.meethue.com/route/api/0/
```

### Get Lights

```
GET https://api.meethue.com/route/api/0/lights
Authorization: Bearer [access_token]
```

### Update Light

```
PUT https://api.meethue.com/route/api/0/lights/{id}/state
Authorization: Bearer [access_token]
Content-Type: application/json

{
  "on": true,
  "bri": 254,
  "hue": 0,
  "sat": 254,
  "transitiontime": 0
}
```

## Security Notes

### DO NOT:
- ❌ Expose client secret in frontend code
- ❌ Commit tokens to git
- ❌ Share tokens between users

### DO:
- ✅ Store client secret in environment variables
- ✅ Use HTTPS in production
- ✅ Validate state parameter (CSRF protection)
- ✅ Refresh tokens before expiry
- ✅ Clear tokens on logout

## Rate Limits

Remote API limits:
- **10 requests/second** per access token
- **1000 requests/day** per app

This is fine for 60Hz updates with 5 lights (300 req/s) because we're using a worker!

## Testing

### Test Local Detection

```typescript
console.log('Should use remote?', shouldUseRemoteAPI());

// localhost:3000 → false (use local)
// 192.168.1.100:3000 → false (use local)
// yourdomain.com → true (use remote)
```

### Test OAuth Flow

1. Deploy to staging
2. Open Hue dropdown
3. Click "Connect with Hue"
4. Should redirect to Hue OAuth
5. Authorize
6. Should redirect back with code
7. Should exchange for tokens
8. Should show connected

## Troubleshooting

### "Invalid callback URL"
- Make sure callback URL in developer portal matches your domain exactly
- Include protocol: `https://yourdomain.com/player`

### "Invalid client_id"
- Check environment variables are set
- Restart dev server after adding env vars

### "Token expired"
- Implement refresh logic
- Tokens expire after 7 days

### "Rate limited"
- Reduce update frequency
- Check for infinite loops

## Migration Plan

1. ✅ Keep existing local API code
2. ✅ Add remote API code (parallel)
3. ✅ Add detection logic
4. ✅ Update UI to show appropriate method
5. ✅ Test locally (should use local API)
6. ✅ Test in staging (should use remote API)
7. ✅ Deploy to production

No breaking changes - local users keep using local API!

