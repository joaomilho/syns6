# Running Prisma Migrations on Vercel

## 🎯 Quick Setup

Your build command has been updated to automatically run migrations on Vercel.

### What Changed
- ✅ `package.json` build script now includes `prisma migrate deploy`
- ✅ `vercel.json` build command updated
- ✅ Migrations will run automatically on every deployment

---

## 📋 First-Time Setup

### Step 1: Create Your Initial Migration (Local)

If you haven't created migrations yet, do this locally:

```bash
# Create your first migration from your current schema
npx prisma migrate dev --name init

# This will:
# - Create a migration file in prisma/migrations/
# - Apply it to your local database
# - Generate the Prisma client
```

**Important:** Commit the migration files to Git!

```bash
git add prisma/migrations
git commit -m "Add initial migration"
git push
```

---

## 🚀 Deploy to Vercel

### Option A: First Deploy (If Schema Already Exists in Neon)

If you've already been using `prisma db push` and your Neon database has tables:

1. **Mark existing schema as migrated:**
   ```bash
   # Set your Neon DATABASE_URL temporarily
   export DATABASE_URL="your_neon_connection_string"
   
   # Mark the current state as the baseline
   npx prisma migrate resolve --applied init
   ```

2. **Deploy to Vercel:**
   ```bash
   git push origin main
   # or
   vercel --prod
   ```

### Option B: Fresh Deploy (Clean Database)

If your Neon database is empty:

1. **Just deploy:**
   ```bash
   git push origin main
   # or
   vercel --prod
   ```

2. The build will automatically:
   - Generate Prisma Client
   - Run all pending migrations
   - Build your Next.js app

---

## 🔄 Subsequent Deployments

Every time you push changes, Vercel will:

1. ✅ Generate Prisma Client (`prisma generate`)
2. ✅ Run pending migrations (`prisma migrate deploy`)
3. ✅ Build your app (`next build`)

### Making Schema Changes

1. **Update your schema locally:**
   ```bash
   # Edit prisma/schema.prisma
   ```

2. **Create a new migration:**
   ```bash
   npx prisma migrate dev --name add_new_field
   ```

3. **Commit and push:**
   ```bash
   git add prisma/migrations prisma/schema.prisma
   git commit -m "Add new field to schema"
   git push
   ```

4. **Vercel will automatically run the new migration on deploy**

---

## 🐛 Troubleshooting

### Error: "Migration failed to apply"

**Cause:** Schema mismatch between your migration and current database state.

**Fix:**
```bash
# Connect to Neon database
export DATABASE_URL="your_neon_connection_string"

# Check migration status
npx prisma migrate status

# If out of sync, resolve manually:
npx prisma migrate resolve --applied <migration_name>
# or
npx prisma migrate resolve --rolled-back <migration_name>
```

### Error: "P3009: migrate found failed migrations"

**Cause:** A migration previously failed.

**Fix:**
```bash
# Mark as rolled back
npx prisma migrate resolve --rolled-back <migration_name>

# Re-run migrations
npx prisma migrate deploy
```

### Database already has tables but no migrations

**Solution:**
```bash
# 1. Create initial migration without applying
npx prisma migrate dev --name init --create-only

# 2. Mark it as already applied
export DATABASE_URL="your_neon_connection_string"
npx prisma migrate resolve --applied init

# 3. Push and deploy
git add prisma/migrations
git commit -m "Add baseline migration"
git push
```

---

## 🔒 Best Practices

### ✅ DO:
- Always create migrations locally first
- Test migrations on development database
- Commit migration files to Git
- Use `prisma migrate dev` in development
- Use `prisma migrate deploy` in production (handled automatically)
- Keep migrations small and focused

### ❌ DON'T:
- Don't use `prisma db push` in production (it skips migrations)
- Don't edit migration files after they've been applied
- Don't delete migration files
- Don't create migrations directly on production

---

## 📊 Check Migration Status

### On Vercel (via logs):
1. Go to Vercel Dashboard
2. Click on your deployment
3. Go to "Functions" tab → View logs
4. Look for Prisma migration output

### Locally (against Neon):
```bash
# Set Neon DATABASE_URL
export DATABASE_URL="your_neon_connection_string"

# Check status
npx prisma migrate status

# View applied migrations
npx prisma migrate status --schema=./prisma/schema.prisma
```

---

## 🔄 Alternative: Using `prisma db push` (Not Recommended)

If you want to use `prisma db push` instead of migrations:

1. **Update build command:**
   ```json
   "build": "prisma generate && prisma db push && next build"
   ```

2. **Cons:**
   - No migration history
   - Can lose data on schema changes
   - Not suitable for production
   - No rollback capability

**Use migrations for production!**

---

## 📝 Common Commands

```bash
# Development
npx prisma migrate dev              # Create and apply migration
npx prisma migrate dev --name <name> # Create migration with name

# Production (automated by Vercel)
npx prisma migrate deploy           # Apply pending migrations
npx prisma migrate status           # Check migration status
npx prisma migrate resolve          # Resolve migration issues

# Utilities
npx prisma studio                   # Open database GUI
npx prisma db seed                  # Run seed file
npx prisma generate                 # Generate Prisma Client
```

---

## 🎯 Quick Checklist

Before deploying to Vercel:

- [ ] Created initial migration (`prisma migrate dev --name init`)
- [ ] Migration files committed to Git
- [ ] `DATABASE_URL` added to Vercel environment variables
- [ ] Tested migration on development database
- [ ] Build command includes `prisma migrate deploy`
- [ ] Ready to deploy!

---

## 🚀 Deploy Now

```bash
# Push to trigger deployment
git push origin main

# Or deploy manually
vercel --prod
```

Watch the build logs to see migrations being applied!

---

## Need Help?

- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Deploying to Vercel](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel)
- [Neon + Prisma Guide](https://neon.tech/docs/guides/prisma)

