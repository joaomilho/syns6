# Vercel Deployment Instructions

## Setup

This site deploys to Vercel and has no database dependencies.

### Important Notes

- The root directory's `vercel.json` has been removed (it was for the player app which uses Prisma)
- This site has its own `vercel.json` in the `site/` directory
- **You MUST set the Root Directory to `site` in your Vercel project settings**

### Steps:
1. Go to your Vercel project settings
2. Navigate to **Settings** → **General**
3. Under **Root Directory**, set it to `site`
4. Save the settings
5. Redeploy

### Verification

After setting the root directory, verify in the build logs that:
- The build uses `site/package.json`
- The build command is `npm run vercel-build` (which runs `next build`)
- No Prisma-related errors appear
