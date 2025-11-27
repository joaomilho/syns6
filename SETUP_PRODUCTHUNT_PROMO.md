# Product Hunt Promo Code Setup

## ✅ Code Updated

The pricing page now automatically applies the `SYNS6HUNT` promo code to all checkouts.

## 🔧 Setup Required

### Step 1: Get Your Stripe Promotion Code ID

1. Go to **Stripe Dashboard** → **Products** → **Coupons**
2. Find your "SYNS6HUNT" coupon (or create it if needed)
3. Click on the coupon
4. In the **Promotion codes** section, find "SYNS6HUNT"
5. Copy the **Promotion Code ID** (starts with `promo_`)
   - Example: `promo_1234567890abcdef`

### Step 2: Add to Environment Variables

Add this line to your `.env.local` file:

```bash
NEXT_PUBLIC_STRIPE_PROMO_SYNS6HUNT=promo_1234567890abcdef
```

Replace `promo_1234567890abcdef` with your actual Promotion Code ID from Step 1.

### Step 3: Restart Dev Server

```bash
npm run dev
```

## 🎯 How It Works

- **All users** who visit `/pricing` will get the SYNS6HUNT promo automatically applied
- The promo code is pre-applied when they click "Start trial"
- They'll see the discount in the Stripe Checkout page
- Users can still manually enter a different code if they want (it will override)

## 📝 To Create the Coupon (if you haven't already)

1. **Stripe Dashboard** → **Products** → **Coupons** → **New**
2. Configure your discount:
   - **Name**: "Product Hunt Launch"
   - **Code**: Leave blank for now
   - **Type**: Choose Percentage or Amount off
   - **Value**: Your discount amount
   - **Duration**: Once, Forever, or Repeating
3. Click **Create coupon**
4. Click **Add promotion code**
5. Enter code: **SYNS6HUNT**
6. Copy the Promotion Code ID
7. Add to `.env.local` as shown above

## 🔄 To Change or Remove Later

### To Change the Promo Code:
Update the environment variable in `.env.local` with a new Promotion Code ID

### To Remove the Promo Code:
In `src/app/pricing/page.tsx`, remove this line:
```typescript
promoCode: process.env.NEXT_PUBLIC_STRIPE_PROMO_SYNS6HUNT,
```

Or set the environment variable to an empty string:
```bash
NEXT_PUBLIC_STRIPE_PROMO_SYNS6HUNT=
```

## 🧪 Testing

1. Make sure the environment variable is set
2. Restart your dev server
3. Go to `/pricing`
4. Click "Start trial"
5. On the Stripe Checkout page, you should see the discount applied

## 📊 Tracking

Check your Stripe Dashboard to see:
- How many people used the promo code
- Total discount amount
- Conversion rate with promo

**Stripe Dashboard** → **Products** → **Coupons** → **SYNS6HUNT** → View analytics

---

**File Modified:** `src/app/pricing/page.tsx`  
**Promo Code:** SYNS6HUNT (for Product Hunt users)  
**Setup Time:** < 5 minutes

