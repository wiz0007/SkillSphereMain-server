import Profile from "../models/Profile.js";
import User from "../models/User.js";
import { sendTransactionalEmail } from "./sendEmail.js";

const getAppBaseUrl = () =>
  (
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    process.env.APP_URL ||
    "https://skillsphere.space"
  ).replace(/\/$/, "");

const formatDateTime = (value: Date | string) =>
  new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const formatDuration = (minutes: number) =>
  minutes >= 60 && minutes % 60 === 0
    ? `${minutes / 60} hour${minutes === 60 ? "" : "s"}`
    : `${minutes} minutes`;

const buildGreeting = (name?: string | null) => name?.trim() || "there";

export const shouldSendSessionEmails = async (userId: string) => {
  const profile = await Profile.findOne({ user: userId })
    .select("settings.notifications.sessionUpdates")
    .lean();

  return profile?.settings?.notifications?.sessionUpdates !== false;
};

export const sendWelcomeEmail = async ({
  to,
  name,
}: {
  to: string;
  name?: string | null;
}) => {
  await sendTransactionalEmail({
    to,
    subject: "Welcome to SkillSphere",
    title: `Welcome to SkillSphere, ${buildGreeting(name)}!`,
    intro:
      "Your account has been created successfully. Verify your email to unlock your dashboard, sessions, wallet, and tutor tools.",
    accent: "#2ec4b6",
    ctaLabel: "Open SkillSphere",
    ctaHref: `${getAppBaseUrl()}/login`,
    outro:
      "We’ve also sent your OTP separately, so you can confirm your account and get started right away.",
  });
};

export const sendVerificationReminderEmail = async ({
  to,
  name,
}: {
  to: string;
  name?: string | null;
}) => {
  await sendTransactionalEmail({
    to,
    subject: "Reminder: verify your SkillSphere email",
    title: "Complete your email verification",
    intro: `${buildGreeting(
      name
    )}, your SkillSphere account is waiting for confirmation.`,
    accent: "#ffb703",
    ctaLabel: "Go to login",
    ctaHref: `${getAppBaseUrl()}/login`,
    outro:
      "Use the latest OTP we emailed to you. If it expired, request a fresh code from the verification screen.",
  });
};

export const sendVerificationSuccessEmail = async ({
  to,
  name,
}: {
  to: string;
  name?: string | null;
}) => {
  await sendTransactionalEmail({
    to,
    subject: "Your SkillSphere email is verified",
    title: "Verification successful",
    intro: `Nice work, ${buildGreeting(
      name
    )}. Your account is now verified and ready for the full SkillSphere experience.`,
    accent: "#2ec4b6",
    ctaLabel: "Open dashboard",
    ctaHref: `${getAppBaseUrl()}/dashboard`,
    outro:
      "You can now explore courses, request sessions, recharge SkillCoin, and build your profile with full access.",
  });
};

export const sendVerificationReviewEmail = async ({
  to,
  name,
  type,
  status,
  reviewNote,
}: {
  to: string;
  name?: string | null;
  type: "identity" | "tutor";
  status: "approved" | "rejected" | "resubmission_required";
  reviewNote?: string;
}) => {
  const titles = {
    identity: "Identity verification",
    tutor: "Tutor verification",
  };

  const subjectMap = {
    approved: `${titles[type]} approved`,
    rejected: `${titles[type]} rejected`,
    resubmission_required: `${titles[type]} needs resubmission`,
  };

  const introMap = {
    approved: `Good news, ${buildGreeting(
      name
    )}. Your ${titles[type].toLowerCase()} has been approved.`,
    rejected: `Your ${titles[type].toLowerCase()} was not approved this time.`,
    resubmission_required: `Your ${titles[type].toLowerCase()} needs one more update before it can be approved.`,
  };

  const ctaLabel =
    status === "approved"
      ? type === "tutor"
        ? "View profile"
        : "Open SkillSphere"
      : "Review verification status";

  await sendTransactionalEmail({
    to,
    subject: subjectMap[status],
    title: subjectMap[status],
    intro: introMap[status],
    accent: status === "approved" ? "#2ec4b6" : "#ffb703",
    ctaLabel,
    ctaHref:
      type === "tutor"
        ? `${getAppBaseUrl()}/become-tutor`
        : `${getAppBaseUrl()}/profile`,
    ...(reviewNote
      ? {
          body: `<p style="line-height:1.7;color:#475569;margin:0 0 14px;"><strong>Reviewer note:</strong> ${reviewNote}</p>`,
        }
      : {}),
    outro:
      status === "approved"
        ? type === "tutor"
          ? "Your verified tutor badge should now be visible across SkillSphere."
          : "You now qualify for the blue verified tick wherever your profile appears."
        : "You can review the latest status and submit updated details from your profile area.",
  });
};

export const sendSessionRequestReceivedEmail = async ({
  to,
  tutorName,
  studentName,
  courseTitle,
  sessionDate,
  durationMinutes,
}: {
  to: string;
  tutorName?: string | null;
  studentName: string;
  courseTitle: string;
  sessionDate: Date | string;
  durationMinutes: number;
}) => {
  await sendTransactionalEmail({
    to,
    subject: "New session request received",
    title: "A learner requested a session",
    intro: `${buildGreeting(
      tutorName
    )}, ${studentName} has requested "${courseTitle}" on ${formatDateTime(
      sessionDate
    )}.`,
    accent: "#2ec4b6",
    ctaLabel: "Review session requests",
    ctaHref: `${getAppBaseUrl()}/sessions`,
    outro: `Requested duration: ${formatDuration(durationMinutes)}.`,
  });
};

export const sendSessionStatusEmail = async ({
  to,
  recipientName,
  tutorName,
  courseTitle,
  sessionDate,
  durationMinutes,
  status,
}: {
  to: string;
  recipientName?: string | null;
  tutorName: string;
  courseTitle: string;
  sessionDate: Date | string;
  durationMinutes: number;
  status: "accepted" | "cancelled" | "completed";
}) => {
  const subjectMap = {
    accepted: "Your session has been accepted",
    cancelled: "Your session request was declined",
    completed: "Your session was marked complete",
  };

  const introMap = {
    accepted: `${tutorName} accepted your request for "${courseTitle}".`,
    cancelled: `${tutorName} declined your request for "${courseTitle}". Any locked SkillCoin has been released back to your wallet.`,
    completed: `${tutorName} marked "${courseTitle}" as complete. Open SkillSphere to confirm completion when you're ready.`,
  };

  await sendTransactionalEmail({
    to,
    subject: subjectMap[status],
    title: subjectMap[status],
    intro: `${buildGreeting(recipientName)}, ${introMap[status]}`,
    accent: status === "cancelled" ? "#ffb703" : "#2ec4b6",
    ctaLabel: "Open sessions",
    ctaHref: `${getAppBaseUrl()}/sessions`,
    outro: `Scheduled time: ${formatDateTime(sessionDate)} · ${formatDuration(
      durationMinutes
    )}.`,
  });
};

export const sendSessionConfirmationEmail = async ({
  to,
  tutorName,
  studentName,
  courseTitle,
}: {
  to: string;
  tutorName?: string | null;
  studentName: string;
  courseTitle: string;
}) => {
  await sendTransactionalEmail({
    to,
    subject: "Session completion confirmed",
    title: "Your session has been confirmed",
    intro: `${buildGreeting(
      tutorName
    )}, ${studentName} confirmed the completion of "${courseTitle}".`,
    accent: "#2ec4b6",
    ctaLabel: "View sessions",
    ctaHref: `${getAppBaseUrl()}/sessions`,
    outro: "Any pending SkillCoin settlement for this session has now been completed.",
  });
};

export const sendSessionReminderEmail = async ({
  to,
  recipientName,
  partnerName,
  courseTitle,
  sessionDate,
  durationMinutes,
}: {
  to: string;
  recipientName?: string | null;
  partnerName: string;
  courseTitle: string;
  sessionDate: Date | string;
  durationMinutes: number;
}) => {
  await sendTransactionalEmail({
    to,
    subject: "Reminder: your SkillSphere session starts soon",
    title: "Upcoming session reminder",
    intro: `${buildGreeting(
      recipientName
    )}, your "${courseTitle}" session with ${partnerName} is scheduled for ${formatDateTime(
      sessionDate
    )}.`,
    accent: "#ffb703",
    ctaLabel: "Open upcoming sessions",
    ctaHref: `${getAppBaseUrl()}/sessions`,
    outro: `Planned duration: ${formatDuration(durationMinutes)}.`,
  });
};

export const sendRecordedCourseEmail = async ({
  to,
  recipientName,
  courseTitle,
  actorName,
  status,
}: {
  to: string;
  recipientName?: string | null;
  courseTitle: string;
  actorName: string;
  status: "request_received" | "approved" | "rejected";
}) => {
  const subjectMap = {
    request_received: "New recorded-course unlock request",
    approved: "Recorded course unlocked",
    rejected: "Recorded course unlock declined",
  };

  const introMap = {
    request_received: `${actorName} requested access to your recorded course "${courseTitle}".`,
    approved: `${actorName} approved your access to "${courseTitle}".`,
    rejected: `${actorName} declined your unlock request for "${courseTitle}". Any locked SkillCoin has been released.`,
  };

  await sendTransactionalEmail({
    to,
    subject: subjectMap[status],
    title: subjectMap[status],
    intro: `${buildGreeting(recipientName)}, ${introMap[status]}`,
    accent: status === "rejected" ? "#ffb703" : "#2ec4b6",
    ctaLabel: "Open course",
    ctaHref: `${getAppBaseUrl()}/explore`,
  });
};

export const sendTuitionEmail = async ({
  to,
  recipientName,
  courseTitle,
  actorName,
  status,
}: {
  to: string;
  recipientName?: string | null;
  courseTitle: string;
  actorName: string;
  status: "request_received" | "approved" | "rejected";
}) => {
  const subjectMap = {
    request_received: "New tuition enrollment request",
    approved: "Tuition enrollment approved",
    rejected: "Tuition enrollment declined",
  };

  const introMap = {
    request_received: `${actorName} requested enrollment in your tuition course "${courseTitle}".`,
    approved: `${actorName} approved your tuition enrollment for "${courseTitle}". Your recurring classes are now active.`,
    rejected: `${actorName} declined your tuition request for "${courseTitle}". Any locked SkillCoin has been released.`,
  };

  await sendTransactionalEmail({
    to,
    subject: subjectMap[status],
    title: subjectMap[status],
    intro: `${buildGreeting(recipientName)}, ${introMap[status]}`,
    accent: status === "rejected" ? "#ffb703" : "#2ec4b6",
    ctaLabel: "Open sessions",
    ctaHref: `${getAppBaseUrl()}/sessions`,
  });
};

export const fetchUserEmailContext = async (userId: string) => {
  const [user, profile] = await Promise.all([
    User.findById(userId).select("email username isVerified").lean(),
    Profile.findOne({ user: userId }).select("fullName settings.notifications.sessionUpdates").lean(),
  ]);

  if (!user) {
    return null;
  }

  return {
    email: user.email,
    username: user.username,
    fullName: profile?.fullName || "",
    sessionUpdates: profile?.settings?.notifications?.sessionUpdates !== false,
  };
};
