import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { priceId, currency, promoCode } = await req.json();

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    // Validate currency (optional but recommended)
    const validCurrencies = [
      'aed', 'ars', 'aud', 'brl', 'cad', 'chf', 'clp', 'cny', 'dkk', 'eur',
      'gbp', 'hkd', 'idr', 'ils', 'inr', 'isk', 'jpy', 'krw', 'mxn', 'myr',
      'ngn', 'nok', 'pkr', 'pln', 'rub', 'sek', 'sgd', 'thb', 'try', 'twd',
      'uah', 'usd', 'uyu', 'zar'
    ];
    
    const checkoutCurrency = currency && validCurrencies.includes(currency.toLowerCase()) 
      ? currency.toLowerCase() 
      : 'eur'; // Default fallback

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(
      session.user.id,
      session.user.email!,
      session.user.name
    );

    // Create Stripe checkout session with 3-day free trial (no credit card required)
    const checkoutSessionConfig: any = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      payment_method_collection: 'if_required', // Skip payment method during trial
      currency: checkoutCurrency,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/player?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXTAUTH_URL}/player?canceled=true`,
      metadata: {
        userId: session.user.id,
        currency: checkoutCurrency,
      },
      billing_address_collection: 'auto',
      subscription_data: {
        trial_period_days: 3, // 3-day free trial
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'cancel', // Cancel subscription if no payment method is added by trial end
          },
        },
        metadata: {
          userId: session.user.id,
          currency: checkoutCurrency,
        },
      },
    };

    // If a promo code is provided, pre-apply it (requires Stripe Promotion Code ID)
    // Note: Can't use both 'discounts' and 'allow_promotion_codes' together
    if (promoCode) {
      checkoutSessionConfig.discounts = [{
        promotion_code: promoCode, // Stripe Promotion Code ID (e.g., 'promo_xxxxx')
      }];
    } else {
      // Only allow manual promotion code entry if we're not pre-applying one
      checkoutSessionConfig.allow_promotion_codes = true;
    }

    let checkoutSession;
    try {
      checkoutSession = await stripe.checkout.sessions.create(checkoutSessionConfig);
    } catch (stripeError: any) {
      // If promo code fails due to customer having prior transactions, retry without it
      if (
        promoCode &&
        stripeError?.message?.includes('promotion code cannot be redeemed') &&
        stripeError?.message?.includes('prior transactions')
      ) {
        console.log('Promo code not applicable for returning customer, retrying without promo code');
        delete checkoutSessionConfig.discounts;
        checkoutSessionConfig.allow_promotion_codes = true;
        checkoutSession = await stripe.checkout.sessions.create(checkoutSessionConfig);
      } else {
        throw stripeError;
      }
    }

    return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

