# 🚀 Vercel Deployment - Quick Start

**Total time: ~15 minutes**

## TL;DR

1. Set up Neon database (5 min)
2. Deploy to Vercel (3 min)
3. Add environment variables (5 min)
4. Update Spotify redirect URI (2 min)

---

## Step 1: Neon Database Setup

### Sign up & Create Database
```bash
# 1. Go to https://neon.tech and sign up
# 2. Click "Create a project"
# 3. Name it "syns-db" and choose your region
# 4. Copy your connection string
```

Your connection string looks like:
```
postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/neondb?sslmode=require
```

### Test Locally (Optional but Recommended)
```bash
# Set database URL
export DATABASE_URL="your_neon_connection_string"

# Push schema
npm run db:push

# Verify
npm run db:studio
```

---

## Step 2: Deploy to Vercel

### Option A: CLI (Fastest)
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - What's your project's name? syns
# - In which directory is your code located? ./
# - Want to override settings? No
```

### Option B: GitHub
```bash
# Push code
git add .
git commit -m "Add Vercel deployment config"
git push

# Then go to vercel.com/new and import your repo
```

---

## Step 3: Add Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

### Required Variables

| Variable | Value | Where to Get It |
|----------|-------|-----------------|
| `DATABASE_URL` | `postgresql://...` | From Neon dashboard |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Your Vercel URL |
| `NEXTAUTH_SECRET` | Random string | Run: `openssl rand -base64 32` |
| `SPOTIFY_CLIENT_ID` | Your Spotify client ID | [Spotify Dashboard](https://developer.spotify.com/dashboard) |
| `SPOTIFY_CLIENT_SECRET` | Your Spotify secret | [Spotify Dashboard](https://developer.spotify.com/dashboard) |

### Optional Variables

| Variable | Value |
|----------|-------|
| `YOUTUBE_API_KEY` | Your YouTube Data API key |

**After adding all variables, redeploy:**
- Dashboard → Deployments → Click ⋯ → Redeploy

---

## Step 4: Update Spotify Redirect URI

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Open your app
3. Click "Edit Settings"
4. Add to "Redirect URIs":
   ```
   https://your-app-name.vercel.app/api/auth/callback/spotify
   ```
5. Save

---

## Step 5: Verify 🎉

Visit `https://your-app-name.vercel.app` and:
- [ ] Click "Sign in with Spotify"
- [ ] Authorize the app
- [ ] Play a song
- [ ] Watch the visualizations

---

## Common Issues

### Build Fails
```bash
# Check logs in Vercel dashboard
# Usually means missing DATABASE_URL
```

### Auth Doesn't Work
```bash
# Check Spotify redirect URI matches exactly
# Verify NEXTAUTH_URL and NEXTAUTH_SECRET are set
```

### Database Connection Error
```bash
# Ensure DATABASE_URL ends with ?sslmode=require
# Check Neon project is active (not suspended)
```

---

## Quick Commands

```bash
# Deploy preview
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs

# Open project in browser
vercel open
```

---

## Environment Variables Template

Copy from `env.template` in this repo or use this:

```bash
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
SPOTIFY_CLIENT_ID="your_client_id"
SPOTIFY_CLIENT_SECRET="your_client_secret"
YOUTUBE_API_KEY="optional_youtube_key"
```

---

## What Happens on Deploy?

1. Vercel runs `npm install`
2. Runs `prisma generate` (creates DB client)
3. Runs `next build` (builds your app)
4. Deploys to global CDN
5. Your app is live! 🚀

---

## Auto-Deploy

Once set up, every push to `main` triggers:
- ✅ Automatic build
- ✅ Automatic deployment
- ✅ Preview URL for testing

---

## Costs

**Free Tier Limits:**
- Vercel: 100GB bandwidth, unlimited deployments
- Neon: 0.5GB storage, 191.9 compute hours/month

**Perfect for hobby projects!**

---

## Next Steps

- [ ] Set up custom domain (optional)
- [ ] Enable Vercel Analytics
- [ ] Set up monitoring alerts
- [ ] Add more songs to your database

---

**Need detailed instructions?** See `DEPLOYMENT.md`

**Questions?** Check [Vercel docs](https://vercel.com/docs) or [Neon docs](https://neon.tech/docs)

