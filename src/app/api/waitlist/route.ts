import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if already exists
    const existing = await prisma.emailSubscriber.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      // Still return success - don't reveal if email exists
      return NextResponse.json({ success: true, message: "You're on the list!" });
    }

    // Save to database
    await prisma.emailSubscriber.create({
      data: {
        email: normalizedEmail,
      },
    });

    console.log("✅ New waitlist signup:", normalizedEmail);

    // Send notification email to yo@syns6.com
    try {
      await resend.emails.send({
        from: "syns6 Waitlist <yo@syns6.com>",
        to: "yo@syns6.com",
        subject: `🆕 New waitlist signup: ${normalizedEmail}`,
        html: `
          <h2>New Waitlist Signup!</h2>
          <p><strong>Email:</strong> ${normalizedEmail}</p>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <hr />
          <p>This person just signed up for the syns6 waitlist.</p>
        `,
      });
      console.log("✅ Notification email sent to yo@syns6.com");
    } catch (emailError) {
      // Don't fail the request if email notification fails
      console.error("❌ Failed to send notification email:", emailError);
    }

    return NextResponse.json({ success: true, message: "You're on the list!" });
  } catch (error) {
    console.error("❌ Waitlist signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

