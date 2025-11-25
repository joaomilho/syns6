import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';

// Disable body parsing for webhook
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = (await headers()).get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
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

  // Validate required fields
  if (!subscription.current_period_start || !subscription.current_period_end) {
    console.error('Missing required period dates in subscription:', {
      id: subscription.id,
      current_period_start: subscription.current_period_start,
      current_period_end: subscription.current_period_end,
    });
    return;
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

