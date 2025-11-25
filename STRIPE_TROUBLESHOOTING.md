# Stripe Integration - Troubleshooting Guide

## Current Issue: Invalid Date Error in Webhook

### Problem
You're seeing this error:
```
Invalid value for argument `currentPeriodStart`: Provided Date object is invalid. Expected Date.
```

### Root Cause
The Prisma client hasn't been regenerated after adding the new subscription models.

### Solution

**Step 1: Generate Prisma Client**
```bash
npm run db:generate
```

**Step 2: Create and Run Migration**
```bash
npm run db:migrate
# When prompted, name it: add_stripe_subscriptions
```

Or manually:
```bash
npx prisma migrate dev --name add_stripe_subscriptions
```

**Step 3: Verify Database**
```bash
npm run db:studio
```

Check that you now have:
- `subscriptions` table
- `stripe_events` table
- `users` table has `stripeCustomerId` column

**Step 4: Restart Dev Server**
```bash
# Stop your current dev server (Ctrl+C)
npm run dev
```

**Step 5: Restart Stripe CLI**
```bash
# In a separate terminal
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Environment Variables Checklist

Make sure your `.env.local` has all these variables:

```bash
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."

# Spotify
SPOTIFY_CLIENT_ID="..."
SPOTIFY_CLIENT_SECRET="..."

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Stripe Price IDs
NEXT_PUBLIC_STRIPE_PRICE_ID_WEEKLY="price_..."
NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY="price_..."
NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY="price_..."
```

**Note:** Make sure your price ID environment variables have the `NEXT_PUBLIC_` prefix so they're accessible in the client!

## Testing the Fix

### 1. Test Stripe Connection
```bash
npx tsx scripts/test-stripe-webhook.ts
```

This will verify:
- Stripe API keys are working
- Products and prices are set up
- Webhook endpoints are configured

### 2. Test a Checkout

1. Visit: http://localhost:3000/pricing
2. Click on any plan
3. Use test card: `4242 4242 4242 4242`
4. Use any future expiry date (e.g., 12/25)
5. Use any CVC (e.g., 123)
6. Complete the checkout

### 3. Check Webhook Logs

In the terminal running `stripe listen`, you should see:
```
✅ Checkout completed for user [userId]
✅ Updated subscription for user [userId]: active
```

In your dev server terminal, look for:
```
📝 Upserting subscription with data: { ... }
✅ Updated subscription for user [userId]: active
```

### 4. Verify in Database

```bash
npm run db:studio
```

Check the `subscriptions` table - you should see a new record with:
- `userId` matching your account
- `status` = "active" or "trialing"
- Valid dates for `currentPeriodStart` and `currentPeriodEnd`

## Common Issues

### Issue: "Property 'subscription' does not exist on PrismaClient"

**Solution:** Run `npm run db:generate` to regenerate the Prisma client.

### Issue: Webhook returns 200 but subscription not created

**Check:**
1. Is the Stripe CLI running? (`stripe listen ...`)
2. Is the webhook secret correct in `.env.local`?
3. Check the `stripe_events` table - is the event being logged?
4. Check your dev server logs for errors

### Issue: "No userId in subscription metadata"

**Solution:** The checkout session needs to include metadata. Verify in `src/app/api/stripe/checkout/route.ts`:

```typescript
subscription_data: {
  metadata: {
    userId: session.user.id,  // ← Make sure this is here
  },
}
```

### Issue: Price IDs showing as undefined in UI

**Solution:** Price ID environment variables must have `NEXT_PUBLIC_` prefix:

```bash
# ❌ Wrong
STRIPE_PRICE_ID_MONTHLY="price_..."

# ✅ Correct
NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY="price_..."
```

After changing, restart your dev server.

### Issue: "Invalid Date" still appearing

**Check:**
1. Restart dev server after running migrations
2. Clear Next.js cache: `rm -rf .next`
3. Check the webhook event payload in Stripe Dashboard → Developers → Events
4. The subscription object should have `current_period_start` and `current_period_end` as Unix timestamps

**Debug:** Add logging to see what's being received:
```typescript
console.log('Subscription object:', JSON.stringify(subscription, null, 2));
```

### Issue: Webhook signature verification fails

**Symptoms:**
```
Webhook signature verification failed
```

**Solutions:**
1. Make sure you're using the webhook secret from `stripe listen` output
2. If using production webhook, get secret from Stripe Dashboard
3. Verify no extra spaces in `.env.local`
4. Restart dev server after updating webhook secret

### Issue: Can't find Stripe CLI

**Install:**
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.2/stripe_1.19.2_linux_x86_64.tar.gz
tar -xvf stripe_1.19.2_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/

# Windows
scoop install stripe
```

Then login:
```bash
stripe login
```

## Debugging Webhooks

### View Recent Events in Stripe Dashboard
1. Go to: https://dashboard.stripe.com/test/events
2. Find your recent checkout/subscription events
3. Click on an event to see the full payload
4. Check that `current_period_start` and `current_period_end` are present

### Test Webhook Manually

Create a test event:
```bash
stripe trigger customer.subscription.created
```

This will send a test webhook to your local endpoint.

### Check Database Events

```bash
npm run db:studio
```

Go to `stripe_events` table and check:
- Are events being logged?
- What's in the `data` field? (JSON payload)
- Is `processed` being set to true?

## Still Having Issues?

### 1. Check All Logs
- Dev server terminal
- Stripe CLI terminal
- Browser console
- Stripe Dashboard → Events

### 2. Verify Migration Applied
```bash
npx prisma db pull
```

This will show you what's actually in your database.

### 3. Reset and Try Again

If all else fails:
```bash
# Reset database (WARNING: deletes data)
npx prisma migrate reset

# Regenerate client
npm run db:generate

# Run seed if you have one
npm run db:seed

# Restart everything
npm run dev
# In another terminal:
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Success Checklist

✅ Prisma client generated  
✅ Migration applied successfully  
✅ Database tables exist (subscriptions, stripe_events)  
✅ Environment variables set (with NEXT_PUBLIC_ prefix)  
✅ Stripe CLI running and listening  
✅ Dev server running  
✅ Test checkout completes  
✅ Webhook receives events  
✅ Subscription appears in database  
✅ Subscription status shows on /pricing page  

Once all of these are checked, your Stripe integration should be working! 🎉

