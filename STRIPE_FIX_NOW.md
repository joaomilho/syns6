# 🚨 Quick Fix for Current Webhook Error

## Your Error:
```
Invalid value for argument `currentPeriodStart`: Provided Date object is invalid.
```

## The Problem:
The Prisma client doesn't have the new `Subscription` and `StripeEvent` models yet.

## The Solution (3 commands):

### 1️⃣ Generate Prisma Client
```bash
npm run db:generate
```

### 2️⃣ Run Migration
```bash
npm run db:migrate
```
When prompted for a name, use: `add_stripe_subscriptions`

### 3️⃣ Restart Everything

**Terminal 1 - Stop and restart dev server:**
```bash
# Press Ctrl+C to stop
npm run dev
```

**Terminal 2 - Stop and restart Stripe CLI:**
```bash
# Press Ctrl+C to stop
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Environment Variables - IMPORTANT!

Make sure your `.env.local` has these with `NEXT_PUBLIC_` prefix:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
NEXT_PUBLIC_STRIPE_PRICE_ID_WEEKLY="price_..."
NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY="price_..."
NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY="price_..."
```

## Test It:

1. Visit: http://localhost:3000/pricing
2. Click a plan
3. Use test card: `4242 4242 4242 4242`
4. Complete checkout
5. Check your terminal for: `✅ Updated subscription for user`

## Verify Success:

```bash
npm run db:studio
```

Check the `subscriptions` table - you should see your new subscription!

---

## Still Not Working?

Run the automated setup:
```bash
./scripts/setup-stripe.sh
```

Or check: `STRIPE_TROUBLESHOOTING.md`

