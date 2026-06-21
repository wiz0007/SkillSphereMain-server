import { Resend } from "resend";

let resendClient: Resend | null = null;

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "Email service is not configured. Add RESEND_API_KEY to server/.env."
    );
  }

  resendClient ??= new Resend(apiKey);
  return resendClient;
};

export const sendOTPEmail = async (to: string, otp: string) => {
  try {
    const response = await getResendClient().emails.send({
      from: "noreply@skillsphere.space", // change after domain verify
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

export const sendPasswordResetEmail = async (to: string, resetLink: string) => {
  try {
    const response = await getResendClient().emails.send({
      from: "noreply@skillsphere.space",
      to,
      subject: "Reset your SkillSphere password",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0f172a;">
          <h2 style="margin-bottom: 12px;">Reset your password</h2>
          <p style="line-height: 1.6; color: #475569;">
            We received a request to reset the password for your SkillSphere account.
          </p>
          <p style="line-height: 1.6; color: #475569;">
            Click the button below to choose a new password. This link expires in 30 minutes.
          </p>
          <div style="margin: 28px 0;">
            <a
              href="${resetLink}"
              style="display: inline-block; padding: 12px 22px; border-radius: 999px; background: #ffb703; color: #0f172a; text-decoration: none; font-weight: 700;"
            >
              Reset password
            </a>
          </div>
          <p style="line-height: 1.6; color: #64748b; font-size: 14px;">
            If you didnâ€™t request this, you can ignore this email and your password will stay unchanged.
          </p>
          <p style="line-height: 1.6; color: #64748b; font-size: 14px; word-break: break-all;">
            If the button doesnâ€™t work, open this link manually:<br />
            <a href="${resetLink}" style="color: #0f766e;">${resetLink}</a>
          </p>
        </div>
      `,
    });

    return response;
  } catch (error: any) {
    console.error("Resend Password Reset Error:", error);
    throw error;
  }
};

export const sendTransactionalEmail = async ({
  to,
  subject,
  title,
  intro,
  body,
  ctaLabel,
  ctaHref,
  outro,
  accent = "#2ec4b6",
}: {
  to: string;
  subject: string;
  title: string;
  intro: string;
  body?: string;
  ctaLabel?: string;
  ctaHref?: string;
  outro?: string;
  accent?: string;
}) => {
  try {
    const response = await getResendClient().emails.send({
      from: "noreply@skillsphere.space",
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 28px; color: #0f172a; background: #f8fafc;">
          <div style="padding: 32px; border-radius: 28px; background: linear-gradient(135deg, rgba(255,255,255,0.98), rgba(236,254,255,0.98)); border: 1px solid rgba(226,232,240,0.9);">
            <p style="margin: 0 0 12px; color: ${accent}; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 800;">SkillSphere</p>
            <h1 style="margin: 0 0 14px; font-size: 30px; line-height: 1.15; color: #0f172a;">${title}</h1>
            <p style="margin: 0 0 18px; color: #475569; line-height: 1.75; font-size: 15px;">${intro}</p>
            ${body || ""}
            ${
              ctaLabel && ctaHref
                ? `<div style="margin: 28px 0;">
                    <a href="${ctaHref}" style="display: inline-block; padding: 12px 22px; border-radius: 999px; background: #ffb703; color: #0f172a; text-decoration: none; font-weight: 800;">
                      ${ctaLabel}
                    </a>
                  </div>`
                : ""
            }
            ${
              outro
                ? `<p style="margin: 16px 0 0; color: #64748b; line-height: 1.7; font-size: 14px;">${outro}</p>`
                : ""
            }
          </div>
        </div>
      `,
    });

    return response;
  } catch (error: any) {
    console.error("Transactional Email Error:", error);
    throw error;
  }
};

