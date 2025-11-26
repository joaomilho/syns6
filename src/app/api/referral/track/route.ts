import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Track a referral - called after user signs up
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { referralCode } = body;

    if (!referralCode) {
      return NextResponse.json({ error: "No referral code provided" }, { status: 400 });
    }

    // Check if user already has a referrer
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { referredBy: true },
    });

    if (currentUser?.referredBy) {
      return NextResponse.json({ message: "Referral already tracked" });
    }

    // Find the referrer by their referral code
    const referrer = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });

    if (!referrer) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    }

    // Don't let users refer themselves
    if (referrer.id === session.user.id) {
      return NextResponse.json({ error: "Cannot refer yourself" }, { status: 400 });
    }

    // Update the new user with referrer
    await prisma.user.update({
      where: { id: session.user.id },
      data: { referredBy: referrer.id },
    });

    // Increment referrer's count
    await prisma.user.update({
      where: { id: referrer.id },
      data: { referralCount: { increment: 1 } },
    });

    return NextResponse.json({ 
      success: true,
      message: "Referral tracked successfully" 
    });
  } catch (error) {
    console.error("Error tracking referral:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

