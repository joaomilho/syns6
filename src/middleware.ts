import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  // Only apply basic auth to /player route
  if (request.nextUrl.pathname.startsWith("/player")) {
    const authHeader = request.headers.get("authorization");

    // Check if we're in production or local environment
    const isProduction = process.env.NODE_ENV === "production";
    
    // Credentials
    const validUsername = "admin";
    const validPassword = isProduction ? "G6h*s^0js7D^" : "admin"; // Hardcoded prod password, local is simple
    
    if (!authHeader) {
      return new NextResponse("Authentication required", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Secure Area"',
        },
      });
    }

    // Parse Basic Auth header
    const auth = authHeader.split(" ")[1];
    const [username, password] = Buffer.from(auth, "base64").toString().split(":");

    // Validate credentials
    if (username !== validUsername || password !== validPassword) {
      return new NextResponse("Invalid credentials", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Secure Area"',
        },
      });
    }

    // Check subscription status (backend protection)
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    
    if (token?.sub) {
      // Check if user has active subscription
      const hasSubscription = await checkUserSubscription(token.sub);
      
      if (!hasSubscription) {
        // Redirect to pricing if no active subscription
        const url = request.nextUrl.clone();
        url.pathname = '/pricing';
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

