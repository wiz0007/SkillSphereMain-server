export declare const sendOTPEmail: (to: string, otp: string) => Promise<import("resend").CreateEmailResponse>;
export declare const sendPasswordResetEmail: (to: string, resetLink: string) => Promise<import("resend").CreateEmailResponse>;
export declare const sendTransactionalEmail: ({ to, subject, title, intro, body, ctaLabel, ctaHref, outro, accent, }: {
    to: string;
    subject: string;
    title: string;
    intro: string;
    body?: string;
    ctaLabel?: string;
    ctaHref?: string;
    outro?: string;
    accent?: string;
}) => Promise<import("resend").CreateEmailResponse>;
//# sourceMappingURL=sendEmail.d.ts.map