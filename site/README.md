# syns6 Site

This is the landing site for syns6. It hosts:
- Home page (/)
- App download page (/app)
- Download redirect (/download)
- FAQ (/faq)
- Terms of Service (/terms)
- Privacy Policy (/privacy)

## Deployment

This site deploys to Vercel and has no database dependencies.

**Important**: When setting up this project in Vercel:
1. Set the **Root Directory** to `site` in your Vercel project settings
2. This ensures Vercel only sees files in the `site` directory and won't try to run Prisma commands from the parent directory

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.
