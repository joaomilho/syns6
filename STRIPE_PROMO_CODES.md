# Stripe Promo Codes Implementation

Your checkout now supports passing promo codes in two ways:

## ✅ Already Implemented

### 1. Manual Entry (UI)
Users can manually enter promo codes in the Stripe Checkout page.
- Already enabled via `allow_promotion_codes: true`
- Users see a "Add promotion code" link in checkout
- No code changes needed

### 2. Pre-Applied Promo Code (Programmatic) ✨ NEW
You can now pass a promo code that will be automatically applied.

## 🔧 How to Use Pre-Applied Promo Codes

### Step 1: Create a Promotion Code in Stripe

1. Go to **Stripe Dashboard** → **Products** → **Coupons**
2. Click **"New"** to create a coupon:
   - Name: e.g., "LAUNCH50"
   - Type: Percentage or Amount
   - Value: e.g., 50% off
   - Duration: Once, Forever, or Repeating
3. Click **"Create coupon"**
4. Click **"Add promotion code"**
5. Enter a code: e.g., "LAUNCH50"
6. Copy the **Promotion Code ID** (starts with `promo_`)

### Step 2: Pass the Promotion Code ID to Checkout

#### From Pricing Page:

**Option A: From URL Parameter**

```typescript
// Example: /pricing?promo=promo_xxxxx
const searchParams = new URLSearchParams(window.location.search);
const promoCode = searchParams.get('promo');

const response = await fetch('/api/stripe/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ 
    priceId: getPriceId(),
    currency: currency.toLowerCase(),
    promoCode: promoCode, // Pass the Promotion Code ID
  }),
});
```

**Option B: Hardcoded for a Campaign**

```typescript
const response = await fetch('/api/stripe/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ 
    priceId: getPriceId(),
    currency: currency.toLowerCase(),
    promoCode: 'promo_1234567890', // Your Stripe Promotion Code ID
  }),
});
```

**Option C: From a State Variable**

```typescript
const [promoCode, setPromoCode] = useState<string | null>(null);

// Later in your component
const response = await fetch('/api/stripe/checkout', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ 
    priceId: getPriceId(),
    currency: currency.toLowerCase(),
    promoCode: promoCode, // From state
  }),
});
```

## 📋 Example: Update Pricing Page

Update `src/app/pricing/page.tsx`:

```typescript
export default function PricingPage() {
  // ... existing code ...
  const [promoCode, setPromoCode] = useState<string | null>(null);

  // Read promo code from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const promo = params.get('promo');
    if (promo) {
      setPromoCode(promo);
      console.log('Promo code detected:', promo);
    }
  }, []);

  const handleStartTrial = async () => {
    // ... existing code ...

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          priceId: getPriceId(),
          currency: currency.toLowerCase(),
          promoCode: promoCode, // Pass promo code if available
        }),
      });

      // ... rest of the code ...
    }
  };

  // ... rest of component ...
}
```

## 🎯 Usage Examples

### Campaign URL
```
https://yoursite.com/pricing?promo=promo_1234567890
```

### Marketing Email
```html
<a href="https://yoursite.com/pricing?promo=promo_LAUNCH50">
  Get 50% Off - Limited Time!
</a>
```

### Social Media Post
```
🎉 Special Launch Offer: 50% OFF!
Use link: yoursite.com/pricing?promo=promo_LAUNCH50
```

## 📝 Important Notes

### Promotion Code ID vs Coupon Code
- **Promotion Code ID**: `promo_xxxxx` (what you pass to the API)
- **Coupon Code**: `LAUNCH50` (what users see/enter manually)

You must use the **Promotion Code ID**, not the human-readable code.

### Finding Your Promotion Code ID
1. Go to **Stripe Dashboard** → **Products** → **Coupons**
2. Click on your coupon
3. Scroll to **Promotion codes** section
4. Copy the ID (starts with `promo_`)

### Testing
Use your Stripe test mode promotion code IDs:
- Test IDs start with `promo_` (same format)
- Create test promotion codes in test mode
- Test in your local environment with test keys

## 🔍 Differences Between Methods

| Method | User Experience | Use Case |
|--------|----------------|----------|
| **Manual Entry** | User types code in checkout | General availability |
| **Pre-Applied** | Code automatically applied | Marketing campaigns, special links |

### Both Methods Can Work Together
- If you pass a `promoCode`, it's pre-applied
- User can still see/enter different codes (if `allow_promotion_codes: true`)
- User's manually entered code overrides pre-applied one

## 🚀 Advanced: Dynamic Promo Codes

You can create a UI for admins to generate/manage promo codes:

```typescript
// Admin panel - create promotion code
const createPromoCode = async (couponId: string, code: string) => {
  const promoCode = await stripe.promotionCodes.create({
    coupon: couponId,
    code: code,
    active: true,
  });
  
  return promoCode.id; // This is what you pass to checkout
};
```

## 🎨 Add Promo Code Badge to Pricing Page (Optional)

Show users when a promo is applied:

```tsx
{promoCode && (
  <div className={styles.promoBadge}>
    🎉 Promo code applied!
  </div>
)}
```

## ⚠️ Error Handling

The checkout will fail gracefully if:
- Invalid promo code ID
- Expired promo code
- Promo code not applicable to the price

Stripe will return an error which you can catch and display to the user.

---

**Created:** November 27, 2025  
**Updated checkout to support pre-applied promo codes**

