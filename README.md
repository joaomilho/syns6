# syns6

**Karaoke, redefined.**

By day, your home. By night, the sickest club in the world. And **you** own it.

## Project Structure

This repository contains two separate projects:

### 1. Site (Root Directory)
- **Purpose**: Marketing/landing site
- **Deployment**: Vercel (deploys from root automatically)
- **Database**: None (no Prisma)
- **Routes**: `/`, `/app`, `/download`, `/faq`, `/terms`, `/privacy`

### 2. Player App (`/player-app`)
- **Purpose**: Main player application bundled with Tauri
- **Deployment**: Bundled with Tauri desktop app (not deployed to Vercel)
- **Database**: SQLite (via Prisma)
- **Routes**: `/player`, `/share`, `/profile`, `/screenshots`, `/video-test`, `/lyrics-test`, `/api/*`

## Development

### Site (Root)
```bash
npm install
npm run dev
```

### Player App
```bash
cd player-app
npm install
npm run dev  # Runs on port 3001
npm run dev:tauri  # Runs with Tauri
```

## Building

### Site
The site builds automatically on Vercel when you push to the repository.

### Player App (Tauri)
```bash
cd player-app
npm run build:app  # Builds Next.js and Tauri app
```

## License

MIT
