import { NextRequest, NextResponse } from "next/server";
import { verifyOTP, updateUserPassword, deleteOTP } from "../../../../lib/users";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: "Email, OTP, and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
    }

    // Verify OTP
    const isOTPValid = await verifyOTP(email, otp);
    if (!isOTPValid) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    // Update password
    const success = await updateUserPassword(email, newPassword);
    if (!success) {
      return NextResponse.json({ error: "Failed to update password" }, { status: 500 });
    }

    // Delete the OTP after successful password reset
    await deleteOTP(email, otp);

    return NextResponse.json({ 
      success: true, 
      message: "Password updated successfully" 
    });

  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json({ 
      error: "Failed to reset password" 
    }, { status: 500 });
  }
}
