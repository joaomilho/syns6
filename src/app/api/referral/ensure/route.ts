import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateReferralCode } from "@/lib/referral";

/**
 * Ensure user has a referral code, generate if needed
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already has a referral code
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { referralCode: true, referralCount: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If user has a code, return it
    if (user.referralCode) {
      return NextResponse.json({
        referralCode: user.referralCode,
        referralCount: user.referralCount,
      });
    }

    // Generate a unique referral code
    let referralCode = generateReferralCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        // Try to update with this code
        const updated = await prisma.user.update({
          where: { id: session.user.id },
          data: { referralCode },
          select: { referralCode: true, referralCount: true },
        });

        return NextResponse.json({
          referralCode: updated.referralCode,
          referralCount: updated.referralCount,
        });
      } catch (error: any) {
        // If unique constraint failed, try a new code
        if (error.code === 'P2002') {
          referralCode = generateReferralCode();
          attempts++;
        } else {
          throw error;
        }
      }
    }

    return NextResponse.json(
      { error: "Failed to generate unique referral code" },
      { status: 500 }
    );
  } catch (error) {
    console.error("Error ensuring referral code:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

