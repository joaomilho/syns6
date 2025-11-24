import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
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
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/player/:path*"],
};

