import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOTPEmail = async (to: string, otp: string) => {
  try {
    const response = await resend.emails.send({
      from: "onboarding@resend.dev", // change after domain verify
      to,
      subject: "Your OTP Code",
      html: `
        <div style="font-family: Arial; text-align:center;">
          <h2>Email Verification</h2>
          <p>Your OTP is:</p>
          <h1>${otp}</h1>
          <p>This OTP expires in 10 minutes.</p>
        </div>
      `,
    });

    return response;
  } catch (error: any) {
    console.error("Resend Email Error:", error);
    throw error;
  }
};