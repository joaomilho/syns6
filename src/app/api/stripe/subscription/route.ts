import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/auth';
import { getUserSubscription, hasActiveSubscription } from '@/lib/stripe';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's subscription
    const subscription = await getUserSubscription(session.user.id);
    const isActive = await hasActiveSubscription(session.user.id);

    return NextResponse.json({
      subscription,
      isActive,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

