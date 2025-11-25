import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

// Initialize Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

// Stripe Price IDs from environment variables
export const STRIPE_PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_ID_MONTHLY || '',
  yearly: process.env.STRIPE_PRICE_ID_YEARLY || '',
};

// Get or create a Stripe customer for a user
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
  name?: string | null
): Promise<string> {
  const prisma = (await import('@/lib/prisma')).default;
  
  // Check if user already has a Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create a new Stripe customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      userId,
    },
  });

  // Save the customer ID to the database
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

// Check if user has an active subscription
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const prisma = (await import('@/lib/prisma')).default;
  
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return false;
  }

  // Check if subscription is active or trialing
  return ['active', 'trialing'].includes(subscription.status);
}

// Get user's subscription details
export async function getUserSubscription(userId: string) {
  const prisma = (await import('@/lib/prisma')).default;
  
  return await prisma.subscription.findUnique({
    where: { userId },
  });
}

// Subscription status type
export type SubscriptionStatus = 
  | 'active' 
  | 'canceled' 
  | 'past_due' 
  | 'unpaid' 
  | 'trialing' 
  | 'incomplete' 
  | 'incomplete_expired'
  | null;

// Get user's subscription status
export async function getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
  const subscription = await getUserSubscription(userId);
  return subscription ? (subscription.status as SubscriptionStatus) : null;
}

