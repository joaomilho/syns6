# Fixing Stripe Webhook Signature Verification on Vercel

Based on [this GitHub discussion](https://github.com/vercel/next.js/discussions/48885), here are the steps to fix webhook signature verification failures in production:

## Issue

```
Webhook signature verification failed: Error: No signatures found matching the expected signature for payload.
```

## Root Causes & Solutions

### 1. ✅ MOST COMMON: Wrong Webhook Secret for Production

**Problem:** You're using the test mode webhook secret in production, but Stripe is sending live mode events.

**Solution:**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Make sure you're in **LIVE MODE** (not test mode)
3. Find your webhook endpoint or create a new one pointing to: `https://yourdomain.vercel.app/api/stripe/webhook`
4. Click "Reveal" next to the signing secret for this webhook
5. Copy the signing secret (starts with `whsec_...`)
6. Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Settings → Environment Variables
7. Update or add `STRIPE_WEBHOOK_SECRET` with the LIVE mode secret
8. **Important:** Redeploy your application after updating the environment variable

**How to verify:**
- Test mode webhook secrets usually start with `whsec_` followed by a different pattern than live mode
- The logs will now show which secret is being used (first 7 + last 4 chars)

### 2. ✅ Vercel Deployment Protection

**Problem:** Vercel's deployment protection may block Stripe webhook requests.

**Solution:**

1. Go to Vercel Dashboard → Your Project → Settings → Deployment Protection
2. If you see "Vercel Authentication" or similar, you need to either:
   - Disable it for production deployments, OR
   - Add Stripe's IP addresses to the allowlist, OR
   - Upgrade to a paid plan to configure per-path protection

**Note:** This is a common issue mentioned in the GitHub discussion.

### 3. ✅ Middleware Interference

**Problem:** Your Next.js middleware might be intercepting the webhook route.

**Solution:**

Check your `src/middleware.ts` file. Make sure the `matcher` config excludes the webhook path:

```typescript
export const config = {
  matcher: [
    // Exclude API routes from middleware
    '/((?!api|static|.*\\..*|_next|auth).*)',
  ],
};
```

Or explicitly exclude the webhook:

```typescript
export const config = {
  matcher: [
    '/api((?!/stripe/webhook).*)',  // Exclude webhook from middleware
  ],
};
```

**Current status:** ✅ Your middleware only runs on `/player/:path*` - no issue here.

### 4. ✅ Raw Body Handling (Already Fixed)

**Problem:** Next.js was parsing the body as JSON, corrupting the signature.

**Solution:** ✅ Your code is already using `req.text()` which gets the raw body correctly.

## Debugging Steps

### Step 1: Check Your Logs

After redeploying with the updated code, check Vercel logs for:

```
🔐 Using webhook secret: whsec_...1234
📝 Signature header: t=1234567890,v1=...
📦 Body length: XXXX bytes
```

This will help you verify which secret is being used.

### Step 2: Verify Webhook Endpoint in Stripe

1. Go to Stripe Dashboard → Developers → Webhooks
2. Check that your endpoint URL is correct: `https://yourdomain.vercel.app/api/stripe/webhook`
3. Make sure you're in the correct mode (test vs live)
4. Check recent webhook attempts - they should show the response from your server

### Step 3: Test the Webhook

1. In Stripe Dashboard, click on your webhook endpoint
2. Click "Send test webhook"
3. Select an event type (e.g., `customer.subscription.updated`)
4. Send the test event
5. Check the response and your Vercel logs

## Quick Fix Checklist

- [ ] Verify you're using the LIVE mode webhook secret from Stripe Dashboard
- [ ] Update `STRIPE_WEBHOOK_SECRET` in Vercel environment variables
- [ ] Redeploy your application on Vercel
- [ ] Check Vercel Deployment Protection settings
- [ ] Test the webhook from Stripe Dashboard
- [ ] Check Vercel logs for the new debug output

## Common Mistakes

1. **Using test mode secret in production** - This is the #1 cause!
2. **Not redeploying after updating environment variables** - Changes don't take effect until you redeploy
3. **Having deployment protection enabled** - This blocks Stripe's requests
4. **Copy-pasting the secret with extra spaces** - Make sure there are no leading/trailing spaces

## Still Having Issues?

If you're still seeing signature verification errors:

1. Check the Vercel logs for the debug output (webhook secret prefix, signature, body length)
2. Verify the webhook secret in Stripe matches the one in Vercel (compare the prefixes)
3. Try creating a completely new webhook endpoint in Stripe and use that new secret
4. Contact Stripe support with the webhook attempt ID from the Stripe Dashboard

## References

- [GitHub Discussion: Stripe Webhook in Next.js issue](https://github.com/vercel/next.js/discussions/48885)
- [Stripe Webhook Signature Verification Docs](https://docs.stripe.com/webhooks/signature)
- [Vercel Environment Variables Docs](https://vercel.com/docs/projects/environment-variables)

