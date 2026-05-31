type LockedResourceState = {
  status: string;
  coinStatus: string;
};

type SessionTransitionStatus = "accepted" | "completed" | "cancelled";

type SessionState = {
  status: string;
  coinStatus: string;
  studentConfirmedCompletionAt?: Date | null;
};

export const ensurePendingLockedResource = (
  resource: LockedResourceState,
  message: string
) => {
  if (resource.status !== "pending" || resource.coinStatus !== "locked") {
    throw new Error(message);
  }
};

export const ensureSessionTransitionAllowed = (
  currentStatus: string,
  nextStatus: SessionTransitionStatus
) => {
  if (nextStatus === "accepted" && currentStatus !== "pending") {
    throw new Error("Only pending sessions can be accepted");
  }

  if (nextStatus === "completed" && currentStatus !== "accepted") {
    throw new Error("Only accepted sessions can be marked complete");
  }

  if (
    nextStatus === "cancelled" &&
    !["pending", "accepted"].includes(currentStatus)
  ) {
    throw new Error("This session can no longer be cancelled");
  }
};

export const ensureSessionConfirmationAllowed = (session: SessionState) => {
  if (session.status !== "completed") {
    throw new Error("The tutor needs to mark the session completed first");
  }

  if (
    session.studentConfirmedCompletionAt ||
    session.coinStatus === "settled" ||
    session.coinStatus === "awaiting_admin_release"
  ) {
    throw new Error("This session has already been confirmed");
  }
};

export const ensureWithdrawalTransitionAllowed = (
  currentStatus: string,
  nextStatus: string
) => {
  if (currentStatus === "paid" || currentStatus === "rejected") {
    throw new Error("This withdrawal request is already closed");
  }

  if (currentStatus === nextStatus) {
    throw new Error(`This withdrawal request is already marked ${nextStatus}`);
  }
};

export const calculateTutorPayout = (grossAmount: number) => {
  const normalizedGross = Math.max(0, Math.round(grossAmount || 0));
  const tutorAmount = Math.floor(normalizedGross * 0.9);

  return {
    grossAmount: normalizedGross,
    tutorAmount,
    commissionAmount: normalizedGross - tutorAmount,
  };
};
