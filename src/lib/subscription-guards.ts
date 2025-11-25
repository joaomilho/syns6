/**
 * Server-side subscription guards for protecting routes and API endpoints
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { hasActiveSubscription } from '@/lib/stripe';
import { NextResponse } from 'next/server';

/**
 * Middleware to require authentication
 * Use this in API routes to ensure user is logged in
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      ),
      session: null,
    };
  }

  return {
    authorized: true,
    response: null,
    session,
  };
}

/**
 * Middleware to require active subscription
 * Use this in API routes to ensure user has paid subscription
 */
export async function requireSubscription() {
  const { authorized, response, session } = await requireAuth();
  
  if (!authorized || !session) {
    return {
      authorized: false,
      response,
      session: null,
    };
  }

  const isSubscribed = await hasActiveSubscription(session.user.id);
  
  if (!isSubscribed) {
    return {
      authorized: false,
      response: NextResponse.json(
        { 
          error: 'Subscription required',
          message: 'This feature requires an active subscription',
        },
        { status: 403 }
      ),
      session: null,
    };
  }

  return {
    authorized: true,
    response: null,
    session,
  };
}

/**
 * Example usage in API route:
 * 
 * export async function GET() {
 *   const { authorized, response, session } = await requireSubscription();
 *   
 *   if (!authorized) {
 *     return response;
 *   }
 *   
 *   // Your premium feature logic here
 *   return NextResponse.json({ data: 'premium data' });
 * }
 */

