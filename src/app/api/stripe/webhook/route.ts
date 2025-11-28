import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';

// This is critical for Stripe webhook signature verification
// We need the raw body, not the parsed JSON
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    console.error('❌ No Stripe signature header found');
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  // Log the webhook secret being used (first/last 4 chars only for security)
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET is not set in environment variables');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  console.log('🔐 Using webhook secret:', `${webhookSecret.substring(0, 7)}...${webhookSecret.substring(webhookSecret.length - 4)}`);
  console.log('📝 Signature header:', signature.substring(0, 20) + '...');
  console.log('📦 Body length:', body.length, 'bytes');

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
    console.log('✅ Webhook signature verified successfully');
  } catch (error: any) {
    console.error('❌ Webhook signature verification failed:', {
      message: error.message,
      type: error.type,
      header: signature,
      secretPrefix: webhookSecret.substring(0, 7),
    });
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  try {
    // Log the event for debugging
    await prisma.stripeEvent.create({
      data: {
        eventId: event.id,
        type: event.type,
        data: JSON.stringify(event.data),
      },
    });

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await prisma.stripeEvent.update({
      where: { eventId: event.id },
      data: { processed: true },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error('No userId in subscription metadata');
    console.error('Subscription object:', JSON.stringify(subscription, null, 2));
    return;
  }

  // If critical fields are missing, fetch the full subscription from Stripe
  if (!subscription.current_period_start || !subscription.current_period_end) {
    console.warn('⚠️ Incomplete subscription object received, fetching from Stripe API...');
    console.warn('Missing fields:', {
      id: subscription.id,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
    });
    
    try {
      // Fetch the complete subscription from Stripe
      const fullSubscription = await stripe.subscriptions.retrieve(subscription.id);
      console.log('✅ Retrieved full subscription from Stripe');
      
      // Recursively call this function with the complete data
      return await handleSubscriptionUpdate(fullSubscription);
    } catch (error) {
      console.error('❌ Failed to retrieve subscription from Stripe:', error);
      return;
    }
  }

  if (!subscription.items?.data?.[0]?.price) {
    console.error('Missing price information in subscription:', subscription.id);
    return;
  }

  const subscriptionData = {
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items.data[0].price.id,
    stripeProductId: subscription.items.data[0].price.product as string,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at 
      ? new Date(subscription.canceled_at * 1000) 
      : null,
    trialStart: subscription.trial_start 
      ? new Date(subscription.trial_start * 1000) 
      : null,
    trialEnd: subscription.trial_end 
      ? new Date(subscription.trial_end * 1000) 
      : null,
  };

  console.log('📝 Upserting subscription with data:', {
    userId,
    subscriptionId: subscriptionData.stripeSubscriptionId,
    status: subscriptionData.status,
    periodStart: subscriptionData.currentPeriodStart.toISOString(),
    periodEnd: subscriptionData.currentPeriodEnd.toISOString(),
  });

  // Upsert subscription
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      ...subscriptionData,
    },
    update: subscriptionData,
  });

  console.log(`✅ Updated subscription for user ${userId}: ${subscription.status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error('No userId in subscription metadata');
    return;
  }

  // Update subscription status
  await prisma.subscription.update({
    where: { userId },
    data: {
      status: 'canceled',
      canceledAt: new Date(),
    },
  });

  console.log(`✅ Canceled subscription for user ${userId}`);
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;

  if (!userId) {
    console.error('No userId in checkout session metadata');
    return;
  }

  console.log(`✅ Checkout completed for user ${userId}`);

  // If this is a subscription checkout, fetch and process the subscription
  if (session.mode === 'subscription' && session.subscription) {
    try {
      const subscriptionId = typeof session.subscription === 'string' 
        ? session.subscription 
        : session.subscription.id;
      
      console.log(`📦 Fetching subscription ${subscriptionId} from checkout`);
      
      // Fetch the full subscription object
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      // Process the subscription
      await handleSubscriptionUpdate(subscription);
    } catch (error) {
      console.error('Error fetching subscription from checkout:', error);
    }
  }
}

