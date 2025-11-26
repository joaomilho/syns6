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

    const { priceId, currency } = await req.json();

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

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
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
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      subscription_data: {
        metadata: {
          userId: session.user.id,
          currency: checkoutCurrency,
        },
      },
    });

    return NextResponse.json({ sessionId: checkoutSession.id, url: checkoutSession.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

