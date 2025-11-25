# Stripe Integration - Quick Start

## ✅ What's Been Installed

The following has been set up in your project:

### 📦 Dependencies
- ✅ `stripe` package added to package.json

### 🗄️ Database Schema
- ✅ Updated `User` model with `stripeCustomerId`
- ✅ Added `Subscription` model
- ✅ Added `StripeEvent` model for webhook logging

### 🔧 API Routes
- ✅ `/api/stripe/checkout` - Create subscription checkout
- ✅ `/api/stripe/portal` - Manage subscriptions
- ✅ `/api/stripe/webhook` - Handle Stripe events
- ✅ `/api/stripe/subscription` - Get subscription status

### 🎨 UI Components
- ✅ `SubscriptionButton` - Subscription purchase buttons
- ✅ `SubscriptionStatus` - Display current subscription
- ✅ `/pricing` page - Full pricing page example

### 🔗 Utilities
- ✅ `lib/stripe.ts` - Server-side Stripe utilities
- ✅ `lib/stripe-client.ts` - Client-side utilities
- ✅ `hooks/useSubscription.ts` - React hook for subscriptions

### 📝 Environment Variables
- ✅ Updated `env.template` with Stripe variables

## 🚀 Next Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Stripe Account

1. Go to https://dashboard.stripe.com
2. Sign up or log in
3. Go to **Developers** → **API keys**
4. Copy your keys

### 3. Create Products

1. In Stripe Dashboard, go to **Products**
2. Click **Add product**
3. Create two products:
   - **Monthly**: $9.99/month (or your price)
   - **Yearly**: $99.99/year (or your price)
4. Copy the **Price IDs** for each

### 4. Configure Environment Variables

Create or update `.env.local`:

```bash
# Add these Stripe variables
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."  # Get this after setting up webhook
STRIPE_PRICE_ID_MONTHLY="price_..."
STRIPE_PRICE_ID_YEARLY="price_..."
```

### 5. Run Database Migration

```bash
# Generate Prisma client
npm run db:generate

# Create and apply migration
npm run db:migrate

# Or if you prefer:
npx prisma migrate dev --name add_stripe_subscriptions
```

### 6. Set Up Webhook (Development)

Install Stripe CLI:
```bash
brew install stripe/stripe-cli/stripe
```

Login and forward webhooks:
```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Copy the webhook signing secret to your `.env.local` as `STRIPE_WEBHOOK_SECRET`

### 7. Start Development Server

```bash
npm run dev
```

### 8. Test It Out!

1. Visit http://localhost:3000/pricing
2. Click "Subscribe" on a plan
3. Use test card: `4242 4242 4242 4242`
4. Use any future date and any CVC
5. Complete checkout

## 🧪 Testing

### Test Cards

- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **3D Secure**: 4000 0025 0000 3155

Use any future expiry date and any CVC (e.g., 123)

### Verify Subscription

After checkout, check:
1. Visit `/pricing` - should show subscription status
2. Database: `npm run db:studio` → Check `subscriptions` table
3. Stripe Dashboard → **Customers** → See your test customer

## 📍 Usage in Your App

### Protect a Route/Feature

```typescript
// In an API route
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { hasActiveSubscription } from '@/lib/stripe';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const hasSubscription = await hasActiveSubscription(session.user.id);
  
  if (!hasSubscription) {
    return new Response('Subscription required', { status: 403 });
  }

  // Premium feature logic...
}
```

### Client Component

```tsx
'use client';
import { useSubscription } from '@/hooks/useSubscription';

export default function PremiumFeature() {
  const { isActive, loading } = useSubscription();

  if (loading) return <div>Loading...</div>;
  if (!isActive) return <div>Subscribe to unlock!</div>;

  return <div>Premium content!</div>;
}
```

### Add Subscription Button Anywhere

```tsx
import SubscriptionButton from '@/components/SubscriptionButton';

<SubscriptionButton
  priceId={process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY!}
  planName="Pro"
  price="$9.99"
  interval="monthly"
  features={['Feature 1', 'Feature 2']}
/>
```

## 🌐 Production Deployment

See `STRIPE_SETUP.md` for detailed production setup including:
- Switching to live mode
- Production webhook setup
- Environment variables for Vercel
- Security best practices

## 📚 Documentation

- **STRIPE_SETUP.md** - Complete setup and configuration guide
- **Stripe Docs** - https://stripe.com/docs

## 🐛 Troubleshooting

### Webhook not receiving events?
- Make sure Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Check webhook secret matches in `.env.local`

### Checkout fails?
- Verify price IDs are correct
- Check Stripe API keys
- Look at browser console and server logs

### Subscription not showing?
- Complete a test checkout
- Check `stripe_events` table in database
- Verify webhook was received

## 💡 Tips

1. **Always test thoroughly** with test cards before going live
2. **Use webhooks** for subscription status updates (already set up!)
3. **Customer Portal** lets users manage their own subscriptions
4. **Metadata** is used to link Stripe data to your users
5. **Start with test mode** and only switch to live when ready

## 🎉 You're Ready!

Your Stripe integration is complete and ready to process subscriptions!

Run the commands above to get started, then visit `/pricing` to see it in action.

