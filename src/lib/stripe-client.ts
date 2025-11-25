/**
 * Client-side Stripe utilities
 * 
 * This file provides client-safe access to Stripe functionality
 * Never import server-side stripe.ts in client components
 */

export const STRIPE_CONFIG = {
  publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
  priceIds: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY || '',
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_YEARLY || '',
  },
} as const;

// Check if Stripe is properly configured
export function isStripeConfigured(): boolean {
  return !!(
    STRIPE_CONFIG.publishableKey &&
    (STRIPE_CONFIG.priceIds.monthly || STRIPE_CONFIG.priceIds.yearly)
  );
}

// Subscription checkout
export async function createCheckoutSession(priceId: string): Promise<{ url: string | null; error?: string }> {
  try {
    const response = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { url: null, error: data.error || 'Failed to create checkout session' };
    }

    return { url: data.url };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return { 
      url: null, 
      error: error instanceof Error ? error.message : 'An error occurred' 
    };
  }
}

// Open customer portal
export async function openCustomerPortal(): Promise<{ url: string | null; error?: string }> {
  try {
    const response = await fetch('/api/stripe/portal', {
      method: 'POST',
    });

    const data = await response.json();

    if (!response.ok) {
      return { url: null, error: data.error || 'Failed to open customer portal' };
    }

    return { url: data.url };
  } catch (error) {
    console.error('Error opening customer portal:', error);
    return { 
      url: null, 
      error: error instanceof Error ? error.message : 'An error occurred' 
    };
  }
}

