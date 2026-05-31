import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateTutorPayout,
  ensurePendingLockedResource,
  ensureSessionConfirmationAllowed,
  ensureSessionTransitionAllowed,
  ensureWithdrawalTransitionAllowed,
} from "./flowGuards.js";

describe("flowGuards", () => {
  describe("locked resource approvals", () => {
    it("allows a pending locked resource", () => {
      assert.doesNotThrow(() =>
        ensurePendingLockedResource(
          { status: "pending", coinStatus: "locked" },
          "blocked"
        )
      );
    });

    it("blocks already-settled recorded or tuition resources", () => {
      assert.throws(
        () =>
          ensurePendingLockedResource(
            { status: "approved", coinStatus: "settled" },
            "blocked"
          ),
        /blocked/
      );
    });
  });

  describe("session transitions", () => {
    it("allows the intended session lifecycle", () => {
      assert.doesNotThrow(() =>
        ensureSessionTransitionAllowed("pending", "accepted")
      );
      assert.doesNotThrow(() =>
        ensureSessionTransitionAllowed("accepted", "completed")
      );
      assert.doesNotThrow(() =>
        ensureSessionTransitionAllowed("pending", "cancelled")
      );
    });

    it("blocks duplicate or out-of-order session transitions", () => {
      assert.throws(
        () => ensureSessionTransitionAllowed("accepted", "accepted"),
        /Only pending sessions can be accepted/
      );
      assert.throws(
        () => ensureSessionTransitionAllowed("completed", "completed"),
        /Only accepted sessions can be marked complete/
      );
      assert.throws(
        () => ensureSessionTransitionAllowed("completed", "cancelled"),
        /can no longer be cancelled/
      );
    });
  });

  describe("session confirmation", () => {
    it("allows an unconfirmed completed session", () => {
      assert.doesNotThrow(() =>
        ensureSessionConfirmationAllowed({
          status: "completed",
          coinStatus: "locked",
        })
      );
    });

    it("blocks confirmation before tutor completion", () => {
      assert.throws(
        () =>
          ensureSessionConfirmationAllowed({
            status: "accepted",
            coinStatus: "locked",
          }),
        /tutor needs to mark/
      );
    });

    it("blocks duplicate confirmation after admin-release handoff", () => {
      assert.throws(
        () =>
          ensureSessionConfirmationAllowed({
            status: "completed",
            coinStatus: "awaiting_admin_release",
          }),
        /already been confirmed/
      );
    });
  });

  describe("withdrawal transitions", () => {
    it("allows pending to processing and processing to paid", () => {
      assert.doesNotThrow(() =>
        ensureWithdrawalTransitionAllowed("pending", "processing")
      );
      assert.doesNotThrow(() =>
        ensureWithdrawalTransitionAllowed("processing", "paid")
      );
    });

    it("blocks repeated and closed withdrawal updates", () => {
      assert.throws(
        () => ensureWithdrawalTransitionAllowed("processing", "processing"),
        /already marked processing/
      );
      assert.throws(
        () => ensureWithdrawalTransitionAllowed("paid", "rejected"),
        /already closed/
      );
    });
  });

  describe("commission payout", () => {
    it("calculates 90 percent tutor payout and 10 percent commission", () => {
      assert.deepEqual(calculateTutorPayout(1000), {
        grossAmount: 1000,
        tutorAmount: 900,
        commissionAmount: 100,
      });
    });

    it("rounds gross SkillCoin and floors tutor payout", () => {
      assert.deepEqual(calculateTutorPayout(11.6), {
        grossAmount: 12,
        tutorAmount: 10,
        commissionAmount: 2,
      });
    });
  });
});
