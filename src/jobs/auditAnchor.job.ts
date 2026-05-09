import { anchorPendingWalletTransactions } from "../services/auditAnchor.service.js";

const RUN_INTERVAL_MS = 15 * 60 * 1000;

let auditAnchorTimer: NodeJS.Timeout | null = null;

export const startAuditAnchorJob = () => {
  if (auditAnchorTimer) {
    return;
  }

  const run = async () => {
    try {
      await anchorPendingWalletTransactions();
    } catch (error) {
      console.error("AUDIT ANCHOR JOB ERROR:", error);
    }
  };

  void run();
  auditAnchorTimer = setInterval(() => {
    void run();
  }, RUN_INTERVAL_MS);
};
