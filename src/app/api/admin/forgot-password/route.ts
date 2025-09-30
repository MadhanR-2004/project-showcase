import { NextRequest, NextResponse } from "next/server";
import { findUserByEmail, createOTP } from "../../../../lib/users";
import { sendOTP } from "../../../../lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user exists
    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Create OTP record
    await createOTP(email, otp);

    // Send OTP via email
    const emailResult = await sendOTP(email, otp);

    if (!emailResult.success) {
      console.error("Failed to send OTP email:", emailResult.error);
      return NextResponse.json({ 
        error: "Failed to send OTP. Please try again." 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "OTP sent to your email address" 
    });

  } catch (error) {
    console.error("Error in forgot password:", error);
    return NextResponse.json({ 
      error: "Failed to process request" 
    }, { status: 500 });
  }
}
