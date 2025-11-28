# 🚨 URGENT: Fix Stripe Webhook Signature Verification on Vercel

## The Problem

You're getting this error in production (Vercel):
```
Webhook signature verification failed: Error: No signatures found matching the expected signature for payload.
```

## The Solution (Most Likely)

**You're using the TEST mode webhook secret in production, but Stripe is sending LIVE mode events.**

## Quick Fix (Do This Now) ⚡

### Step 1: Get the Correct Webhook Secret

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. **Switch to LIVE MODE** (toggle in top left - make sure it says "LIVE" not "TEST")
3. Click on your webhook endpoint (should be `https://your-domain.vercel.app/api/stripe/webhook`)
   - If you don't have one, click "Add endpoint" and enter your webhook URL
   - Select events to listen to: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `checkout.session.completed`
4. Click "Reveal" next to "Signing secret"
5. Copy the secret (starts with `whsec_...`)

### Step 2: Update Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Find `STRIPE_WEBHOOK_SECRET` and click Edit
5. Paste the LIVE mode webhook secret from Step 1
6. Make sure it's set for "Production" environment
7. Save

### Step 3: Redeploy

1. Go to your project's Deployments tab in Vercel
2. Find your latest deployment
3. Click the three dots → Redeploy
4. **Important:** Check "Use existing build cache" = OFF (to ensure new env vars are used)
5. Redeploy

### Step 4: Test

1. Go back to Stripe Dashboard → Webhooks → Your endpoint
2. Click "Send test webhook"
3. Select `customer.subscription.updated`
4. Click "Send test event"
5. Check the response - should show "200 OK"

## Other Things to Check

### Vercel Deployment Protection

1. In Vercel, go to Settings → Deployment Protection
2. If you see "Vercel Authentication" enabled, you need to:
   - Disable it for production, OR
   - Add an exception for `/api/stripe/webhook`

This prevents Stripe from reaching your webhook endpoint.

## How to Know It's Working

After the fix, your Vercel logs should show:

```
🔐 Using webhook secret: whsec_...1234
📝 Signature header: t=1234567890,v1=...
📦 Body length: XXXX bytes
✅ Webhook signature verified successfully
```

If you still see errors, check that:
- The webhook secret starts with `whsec_`
- There are no extra spaces in the environment variable
- You're in LIVE mode in Stripe (not test mode)
- The webhook endpoint URL in Stripe matches your production URL exactly

## Reference

Based on solution from: https://github.com/vercel/next.js/discussions/48885

The code changes have been made to help debug the issue with better logging.

## Still Not Working?

1. Check Vercel function logs for the debug output
2. Compare the webhook secret prefix in logs with what's in Stripe
3. Create a completely new webhook endpoint in Stripe and use that new secret
4. Make sure you're using LIVE mode keys everywhere (STRIPE_SECRET_KEY should start with `sk_live_`)

---

**The #1 mistake is using test mode webhook secret with live mode events. Double-check this first!**

