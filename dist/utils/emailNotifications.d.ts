export declare const shouldSendSessionEmails: (userId: string) => Promise<boolean>;
export declare const sendWelcomeEmail: ({ to, name, }: {
    to: string;
    name?: string | null;
}) => Promise<void>;
export declare const sendVerificationReminderEmail: ({ to, name, }: {
    to: string;
    name?: string | null;
}) => Promise<void>;
export declare const sendVerificationSuccessEmail: ({ to, name, }: {
    to: string;
    name?: string | null;
}) => Promise<void>;
export declare const sendVerificationReviewEmail: ({ to, name, type, status, reviewNote, }: {
    to: string;
    name?: string | null;
    type: "identity" | "tutor";
    status: "approved" | "rejected" | "resubmission_required";
    reviewNote?: string;
}) => Promise<void>;
export declare const sendSessionRequestReceivedEmail: ({ to, tutorName, studentName, courseTitle, sessionDate, durationMinutes, }: {
    to: string;
    tutorName?: string | null;
    studentName: string;
    courseTitle: string;
    sessionDate: Date | string;
    durationMinutes: number;
}) => Promise<void>;
export declare const sendSessionStatusEmail: ({ to, recipientName, tutorName, courseTitle, sessionDate, durationMinutes, status, }: {
    to: string;
    recipientName?: string | null;
    tutorName: string;
    courseTitle: string;
    sessionDate: Date | string;
    durationMinutes: number;
    status: "accepted" | "cancelled" | "completed";
}) => Promise<void>;
export declare const sendSessionConfirmationEmail: ({ to, tutorName, studentName, courseTitle, }: {
    to: string;
    tutorName?: string | null;
    studentName: string;
    courseTitle: string;
}) => Promise<void>;
export declare const sendSessionReminderEmail: ({ to, recipientName, partnerName, courseTitle, sessionDate, durationMinutes, }: {
    to: string;
    recipientName?: string | null;
    partnerName: string;
    courseTitle: string;
    sessionDate: Date | string;
    durationMinutes: number;
}) => Promise<void>;
export declare const sendRecordedCourseEmail: ({ to, recipientName, courseTitle, actorName, status, }: {
    to: string;
    recipientName?: string | null;
    courseTitle: string;
    actorName: string;
    status: "request_received" | "approved" | "rejected";
}) => Promise<void>;
export declare const sendTuitionEmail: ({ to, recipientName, courseTitle, actorName, status, }: {
    to: string;
    recipientName?: string | null;
    courseTitle: string;
    actorName: string;
    status: "request_received" | "approved" | "rejected";
}) => Promise<void>;
export declare const fetchUserEmailContext: (userId: string) => Promise<{
    email: string;
    username: string;
    fullName: string;
    sessionUpdates: boolean;
} | null>;
//# sourceMappingURL=emailNotifications.d.ts.map