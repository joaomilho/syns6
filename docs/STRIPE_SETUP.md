# Stripe Subscription Setup Guide

This guide will help you set up Stripe subscription checkout for your application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Stripe Account Setup](#stripe-account-setup)
3. [Environment Variables](#environment-variables)
4. [Database Migration](#database-migration)
5. [Testing Locally](#testing-locally)
6. [Production Setup](#production-setup)
7. [Usage Examples](#usage-examples)

## Prerequisites

- A Stripe account (https://dashboard.stripe.com)
- PostgreSQL database (already configured)
- NextAuth configured (already configured)

## Stripe Account Setup

### 1. Create Stripe Account

1. Go to https://dashboard.stripe.com and sign up/log in
2. Complete your account verification

### 2. Get API Keys

1. Go to **Developers** → **API keys**
2. Copy your **Publishable key** (starts with `pk_`)
3. Copy your **Secret key** (starts with `sk_`)
4. Save these for later

### 3. Create Products and Prices

#### Monthly Plan:
1. Go to **Products** → **Add product**
2. Name: "Monthly Subscription" (or your choice)
3. Description: Add details about monthly benefits
4. Pricing: 
   - Model: **Recurring**
   - Price: $9.99 (or your choice)
   - Billing period: **Monthly**
5. Click **Save product**
6. Copy the **Price ID** (starts with `price_`)

#### Yearly Plan:
1. Repeat the above steps with:
   - Name: "Yearly Subscription"
   - Price: $99.99 (or your choice)
   - Billing period: **Yearly**
2. Copy the **Price ID**

### 4. Set Up Webhook

#### For Local Development (using Stripe CLI):
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will give you a webhook signing secret (starts with `whsec_`).

#### For Production:
1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)

## Environment Variables

Add these to your `.env.local` file:

```bash
# Stripe
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Stripe Price IDs
STRIPE_PRICE_ID_MONTHLY="price_..."
STRIPE_PRICE_ID_YEARLY="price_..."
```

For production (Vercel), add these same variables in your dashboard:
1. Go to your project → **Settings** → **Environment Variables**
2. Add each variable
3. Use your **production** keys (starts with `pk_live_` and `sk_live_`)

## Database Migration

Run the Prisma migration to add subscription tables:

```bash
# Generate Prisma client
npm run db:generate

# Run migration
npm run db:migrate

# Or for production
npm run db:push
```

This adds three new tables:
- `subscriptions` - Store user subscriptions
- `stripe_events` - Log webhook events for debugging
- Updates `users` table with `stripeCustomerId`

## Testing Locally

1. Install dependencies:
```bash
npm install
```

2. Start Stripe webhook forwarding:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

3. Start your dev server:
```bash
npm run dev
```

4. Visit `http://localhost:3000/pricing`

5. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3D Secure: `4000 0025 0000 3155`
   - Use any future expiry date and any CVC

## Production Setup

### 1. Switch to Live Mode

In Stripe Dashboard, toggle from **Test mode** to **Live mode** (top right)

### 2. Get Live API Keys

1. Go to **Developers** → **API keys**
2. Copy your **live** keys (they start with `pk_live_` and `sk_live_`)

### 3. Create Live Products

Repeat the product creation steps in **Live mode**

### 4. Set Up Production Webhook

1. Go to **Developers** → **Webhooks** (in Live mode)
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select the same events as test mode
4. Copy the **live** signing secret

### 5. Update Environment Variables

In Vercel (or your hosting provider):
1. Update all Stripe environment variables with **live** values
2. Redeploy your application

## Usage Examples

### Basic Subscription Button

```tsx
import SubscriptionButton from '@/components/SubscriptionButton';

export default function MyPage() {
  return (
    <SubscriptionButton
      priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY!}
      planName="Monthly"
      price="$9.99"
      interval="monthly"
      features={[
        'Feature 1',
        'Feature 2',
        'Feature 3',
      ]}
    />
  );
}
```

### Show Subscription Status

```tsx
import SubscriptionStatus from '@/components/SubscriptionStatus';

export default function ProfilePage() {
  return (
    <div>
      <h1>Your Subscription</h1>
      <SubscriptionStatus />
    </div>
  );
}
```

### Check Subscription in API Routes

```typescript
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { hasActiveSubscription } from '@/lib/stripe';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const isSubscribed = await hasActiveSubscription(session.user.id);
  
  if (!isSubscribed) {
    return new Response('Subscription required', { status: 403 });
  }

  // Your premium feature logic here
}
```

### Use Subscription Hook

```tsx
'use client';

import { useSubscription } from '@/hooks/useSubscription';

export default function PremiumFeature() {
  const { subscription, isActive, loading } = useSubscription();

  if (loading) return <div>Loading...</div>;
  
  if (!isActive) {
    return <div>Please subscribe to access this feature</div>;
  }

  return <div>Premium content here!</div>;
}
```

## API Routes

The integration includes these API endpoints:

- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/portal` - Open customer portal
- `GET /api/stripe/subscription` - Get user subscription
- `POST /api/stripe/webhook` - Handle Stripe webhooks

## Database Models

### Subscription Model

```prisma
model Subscription {
  id                   String    @id @default(cuid())
  userId               String    @unique
  stripeSubscriptionId String    @unique
  stripePriceId        String
  status               String
  currentPeriodStart   DateTime
  currentPeriodEnd     DateTime
  cancelAtPeriodEnd    Boolean
  // ... more fields
}
```

## Troubleshooting

### Webhook Not Working

1. Check webhook secret is correct in `.env.local`
2. Make sure Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. Check webhook logs in Stripe Dashboard → **Developers** → **Webhooks**

### Checkout Session Fails

1. Verify price IDs are correct
2. Check Stripe API keys are valid
3. Look at browser console for errors
4. Check Next.js server logs

### Subscription Not Showing

1. Complete a test checkout
2. Check database: `npm run db:studio`
3. Verify webhook was received (check `stripe_events` table)
4. Check Stripe Dashboard → **Payments** to see if payment succeeded

## Security Notes

1. **Never** expose `STRIPE_SECRET_KEY` to the client
2. Always verify webhooks using the signature
3. Use `STRIPE_WEBHOOK_SECRET` to prevent webhook spoofing
4. Always check user authentication before creating checkout sessions
5. Validate subscription status on the backend, not just the frontend

## Customer Portal

Users can manage their subscriptions via the Stripe Customer Portal:
- Update payment method
- Cancel subscription
- View billing history
- Download invoices

Access it via the "Manage Subscription" button in `SubscriptionStatus` component.

## Testing Subscription Lifecycle

1. **Create**: Use test card to subscribe
2. **Active**: Check status shows "Active"
3. **Update**: Change plan in customer portal
4. **Cancel**: Cancel in customer portal (end of period)
5. **Reactivate**: Subscribe again before cancellation
6. **Trial**: Set trial period in Stripe product settings

## Support

- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Test Cards: https://stripe.com/docs/testing

## Next Steps

1. Customize pricing plans to match your business
2. Add trial periods to your products in Stripe
3. Set up email notifications for payment events
4. Create promotional codes in Stripe Dashboard
5. Add usage-based billing if needed
6. Set up tax calculation (Stripe Tax)

