# Vercel Deployment Instructions

## Important: Root Directory Setting

When deploying this site to Vercel, you **must** set the **Root Directory** to `site` in your Vercel project settings.

### Steps:
1. Go to your Vercel project settings
2. Navigate to **Settings** → **General**
3. Under **Root Directory**, set it to `site`
4. Save the settings

This ensures that:
- Vercel only sees files in the `site` directory
- Prisma commands from the parent directory won't run
- The build will use the correct `package.json` and `vercel.json`

Without this setting, Vercel will scan the entire repository and may try to run Prisma commands from the parent directory, causing the `DATABASE_URL` error.

