# Project Separation

This project has been separated into two distinct projects:

## 1. Site (`/site`)

**Purpose**: Marketing/landing site  
**Deployment**: Vercel  
**Database**: None (no Prisma)

**Routes**:
- `/` - Home page
- `/app` - App download page
- `/download` - Redirects to `/app`
- `/faq` - FAQ page
- `/terms` - Terms of Service
- `/privacy` - Privacy Policy

**Key Features**:
- No database dependencies
- Simplified home page (static background image instead of live visualization)
- Lightweight for fast Vercel deployment

## 2. Player App (root project)

**Purpose**: Main player application bundled with Tauri  
**Deployment**: Bundled with Tauri desktop app  
**Database**: SQLite (via Prisma)

**Routes**:
- `/player` - Main player interface
- `/share` - Viewer mode
- `/profile` - User profile
- `/screenshots` - Screenshot gallery
- `/video-test` - Video testing
- `/lyrics-test` - Lyrics testing
- `/api/*` - All API endpoints (use Prisma)

**Key Features**:
- Full Prisma/SQLite database
- All visualization components
- Tauri integration
- Standalone build output for bundling

## Migration Notes

- Marketing pages have been moved to `/site`
- The root project's home page (`/`) now redirects to `/player`
- All API routes remain in the root project
- The site can be deployed independently to Vercel
- The player app continues to work with Tauri bundling

