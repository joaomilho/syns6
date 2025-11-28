# Vercel Deployment Guide

This guide will help you deploy your Syns application to Vercel with Neon PostgreSQL.

## Prerequisites

- GitHub account
- Vercel account (free tier works great)
- Neon account (for PostgreSQL database)
- Spotify Developer account

---

## Step 1: Set Up Neon Database (5 minutes)

### 1.1 Create Neon Account & Database

1. Go to [neon.tech](https://neon.tech) and sign up
2. Click **"Create a project"**
3. Choose:
   - **Project name**: `syns-db` (or any name)
   - **PostgreSQL version**: 16 (latest)
   - **Region**: Choose closest to your users
4. Click **"Create project"**

### 1.2 Get Connection String

1. In your Neon dashboard, click on your project
2. Find the **"Connection string"** section
3. Copy the connection string that looks like:
   ```
   postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   ```
4. **Save this!** You'll need it for Vercel.

### 1.3 Run Migrations (Local Setup)

Before deploying, test your database connection locally:

```bash
# Set your Neon database URL temporarily
export DATABASE_URL="your_neon_connection_string"

# Generate Prisma client
npm run db:generate

# Push schema to Neon
npm run db:push

# Optional: Seed initial data
npm run db:seed
```

---

## Step 2: Prepare Spotify OAuth

### 2.1 Update Redirect URIs

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Open your app
3. Click **"Edit Settings"**
4. In **"Redirect URIs"**, add your Vercel domain:
   ```
   https://your-app-name.vercel.app/api/auth/callback/spotify
   ```
   
   Note: You can add this after deployment too, but you'll need to redeploy

### 2.2 Note Your Credentials

Keep these handy:
- **Client ID**: (from Spotify dashboard)
- **Client Secret**: (from Spotify dashboard)

---

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (follow prompts)
vercel

# When prompted:
# - Link to existing project? No
# - Project name? syns (or your choice)
# - Which scope? (select your account)
# - Link to existing project? No
# - Want to modify settings? No
```

### Option B: Deploy via GitHub (More Common)

1. **Push to GitHub** (if not already there):
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click **"Import Git Repository"**
   - Select your `syns` repository
   - Click **"Import"**

3. **Configure Project**:
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `prisma generate && next build`
   - **Output Directory**: `.next` (default)
   - Click **"Deploy"** (it will fail initially - that's okay!)

---

## Step 4: Configure Environment Variables

1. In Vercel dashboard, go to your project
2. Click **"Settings"** → **"Environment Variables"**
3. Add these variables:

### Database
```
DATABASE_URL
postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require
```

### NextAuth
```
NEXTAUTH_URL
https://your-app-name.vercel.app
```

```
NEXTAUTH_SECRET
(generate with: openssl rand -base64 32)
```

### Spotify
```
SPOTIFY_CLIENT_ID
your_spotify_client_id
```

```
SPOTIFY_CLIENT_SECRET
your_spotify_client_secret
```

### YouTube (Optional)
```
YOUTUBE_API_KEY
your_youtube_api_key
```

4. Click **"Save"** after each variable

---

## Step 5: Redeploy

After adding environment variables:

### Via Vercel Dashboard
1. Go to **"Deployments"** tab
2. Click the three dots menu on the latest deployment
3. Click **"Redeploy"**
4. Check **"Use existing Build Cache"** → NO
5. Click **"Redeploy"**

### Via CLI
```bash
vercel --prod
```

---

## Step 6: Verify Deployment

1. **Visit your app**: `https://your-app-name.vercel.app`
2. **Test authentication**: Click "Sign in with Spotify"
3. **Test database**: Check if user session persists after login
4. **Check logs**: Vercel Dashboard → Functions tab → View logs

---

## Post-Deployment Checklist

- [ ] Spotify OAuth working (can sign in)
- [ ] Database connected (sessions persist)
- [ ] Lyrics fetching works
- [ ] YouTube video search works
- [ ] 3D visualizations render properly
- [ ] No console errors in browser

---

## Updating Your App

Every time you push to your main branch, Vercel will automatically:
1. Build your app
2. Run `prisma generate`
3. Deploy if successful
4. Provide a preview URL

### Manual Deploy
```bash
# Development/preview
vercel

# Production
vercel --prod
```

---

## Troubleshooting

### Build Fails: "Cannot find module '@prisma/client'"
**Fix**: Ensure `buildCommand` in `vercel.json` includes `prisma generate`

### Database Connection Error
**Fix**: 
- Check `DATABASE_URL` in Vercel env vars
- Ensure connection string ends with `?sslmode=require`
- Verify Neon project is active (free tier has compute limits)

### NextAuth Error: "NEXTAUTH_SECRET is not set"
**Fix**: Add `NEXTAUTH_SECRET` environment variable (use `openssl rand -base64 32`)

### Spotify Redirect URI Mismatch
**Fix**: Update Spotify app settings to include:
- `https://your-app-name.vercel.app/api/auth/callback/spotify`
- `https://your-custom-domain.com/api/auth/callback/spotify` (if using custom domain)

### Cold Starts / Slow Initial Load
**Expected**: Vercel serverless functions and Neon free tier both have cold starts (~1-2s)
**Improvement**: Upgrade to Vercel Pro or Neon Pro for always-on compute

### Images Not Loading
**Check**: Verify `next.config.ts` includes Spotify image domains in `remotePatterns`

---

## Neon Free Tier Limits

- **Storage**: 0.5 GB per project (plenty for metadata/lyrics)
- **Compute**: 191.9 compute hours/month
- **Auto-suspend**: Database pauses after 5 minutes of inactivity
- **Branches**: 10 branches per project

**Tip**: Neon auto-scales to zero when idle, so you pay nothing when not using it!

---

## Optional: Custom Domain

1. In Vercel dashboard, go to **"Settings"** → **"Domains"**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Update `NEXTAUTH_URL` environment variable to your custom domain
5. Add custom domain to Spotify redirect URIs

---

## Monitoring & Analytics

### Built-in Vercel Features
- **Analytics**: Dashboard → Analytics tab
- **Logs**: Dashboard → Functions tab
- **Performance**: Real User Monitoring (RUM) available

### Neon Monitoring
- **Database metrics**: Neon dashboard → Monitoring
- **Query performance**: Neon dashboard → Queries

---

## Cost Estimate

### Free Tier (Perfect for hobby projects)
- **Vercel**: Free (100GB bandwidth, unlimited deployments)
- **Neon**: Free (0.5GB storage, 191.9 compute hours/month)
- **Total**: $0/month

### If You Scale
- **Vercel Pro**: $20/month (1TB bandwidth)
- **Neon Scale**: $19/month (10GB storage, always-on compute)
- **Total**: ~$40/month

---

## Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **NextAuth Docs**: https://next-auth.js.org

---

## Quick Commands Reference

```bash
# Local development
npm run dev

# Build locally
npm run build

# Run production build locally
npm start

# Database commands
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database
npm run db:migrate     # Create migration
npm run db:studio      # Open Prisma Studio

# Deploy to Vercel
vercel                 # Preview deployment
vercel --prod          # Production deployment
```

---

**You're all set! 🚀**

Your app should now be live at `https://your-app-name.vercel.app`

