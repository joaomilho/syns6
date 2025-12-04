import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  // Check subscription status for /player route
  if (request.nextUrl.pathname.startsWith("/player")) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    
    if (token?.sub) {
      // Check if user has active subscription
      const hasSubscription = await checkUserSubscription(token.sub);
      
      if (!hasSubscription) {
        // Redirect to subscribe if no active subscription
        const url = request.nextUrl.clone();
        url.pathname = '/subscribe';
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

async function checkUserSubscription(userId: string): Promise<boolean> {
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { status: true },
    });
    
    await prisma.$disconnect();
    
    // Check if subscription is active or trialing
    return subscription ? ['active', 'trialing'].includes(subscription.status) : false;
  } catch (error) {
    console.error('Error checking subscription in middleware:', error);
    return false; // Fail closed - redirect to pricing on error
  }
}

export const config = {
  matcher: ["/player/:path*"],
};

