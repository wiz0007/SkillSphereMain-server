import type { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Profile from "../models/Profile.js";
import Course from "../models/Course.js";
import CourseReview from "../models/CourseReview.js";
import Session from "../models/Session.js";
import Activity from "../models/Activity.js";
import AdminGift from "../models/AdminGift.js";
import WithdrawalRequest from "../models/WithdrawalRequest.js";
import WalletRechargeOrder from "../models/WalletRechargeOrder.js";
import { emitWalletUpdate } from "../config/socket.js";
import { syncAdminAccess } from "../middlewares/adminOnly.js";
import { generateOTP } from "../utils/generateOtp.js";
import { sendOTPEmail, sendPasswordResetEmail } from "../utils/sendEmail.js";
import { getWalletTransactionProof } from "../services/auditAnchor.service.js";
import {
  buildWalletSummary,
  creditSkillCoins,
  getRecentWalletTransactions,
  lockSkillCoins,
  spendLockedSkillCoins,
  unlockSkillCoins,
} from "../utils/wallet.js";

const generateToken = (id: string) => {
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });
};

const getRazorpayConfig = () => ({
  keyId: process.env.RAZORPAY_KEY_ID || "",
  keySecret: process.env.RAZORPAY_KEY_SECRET || "",
});

const getFrontendBaseUrl = (req: Parameters<RequestHandler>[0]) => {
  const configuredBase =
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    process.env.APP_URL;

  if (configuredBase) {
    return configuredBase.replace(/\/$/, "");
  }

  const originHeader = req.headers.origin;
  if (typeof originHeader === "string" && originHeader.trim()) {
    return originHeader.replace(/\/$/, "");
  }

  return "https://skillsphere.space";
};

const RECHARGE_BONUS_OFFERS = [
  {
    amountRupees: 500,
    bonusSkillCoins: 50,
    label: "Recharge 500+ and get 50 extra",
  },
  {
    amountRupees: 1000,
    bonusSkillCoins: 110,
    label: "Recharge 1000+ and get 110 extra",
  },
] as const;

const getRechargeBonus = (amountRupees: number) =>
  [...RECHARGE_BONUS_OFFERS]
    .sort((left, right) => right.amountRupees - left.amountRupees)
    .find((offer) => amountRupees >= offer.amountRupees)?.bonusSkillCoins || 0;

const createRazorpayOrder = async (amountRupees: number) => {
  const { keyId, keySecret } = getRazorpayConfig();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured on the server");
  }

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${Buffer.from(
        `${keyId}:${keySecret}`
      ).toString("base64")}`,
    },
    body: JSON.stringify({
      amount: Math.round(amountRupees * 100),
      currency: "INR",
      receipt: `skillcoin_${Date.now()}`,
      notes: {
        product: "SkillCoin recharge",
      },
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(payload || "Failed to create Razorpay order");
  }

  return (await response.json()) as {
    id: string;
    amount: number;
    currency: string;
  };
};

const verifyRazorpaySignature = ({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) => {
  const { keySecret } = getRazorpayConfig();

  if (!keySecret) {
    throw new Error("Razorpay secret is not configured");
  }

  const generatedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return generatedSignature === signature;
};

const toSafeUser = (
  user: Record<string, any>,
  profile?: {
    isTutor?: boolean | undefined;
    profilePhoto?: string | undefined;
  }
) => {
  const {
    password,
    otp,
    otpExpires,
    passwordResetToken,
    passwordResetExpires,
    otpAttempts,
    lockUntil,
    __v,
    ...safeUser
  } = user;

  return {
    ...safeUser,
    isTutor: profile?.isTutor || false,
    profilePhoto: profile?.profilePhoto || "",
    isAdmin: Boolean(user.isAdmin),
    identityVerificationStatus: user.identityVerificationStatus || "not_started",
    tutorVerificationStatus: user.tutorVerificationStatus || "not_started",
    verifiedBadgeLevel: user.verifiedBadgeLevel || "none",
    ...buildWalletSummary(user as any),
  };
};

export const register: RequestHandler = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: "Weak password" });
    }

    const normalizedUsername = username.trim().toLowerCase();

    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "Email already exists" });
    }

    if (await User.findOne({ username: normalizedUsername })) {
      return res.status(400).json({ message: "Username taken" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();

    const user = await User.create({
      username: normalizedUsername,
      email,
      password: hashedPassword,
      otp: await bcrypt.hash(otp, 10),
      otpExpires: new Date(Date.now() + 10 * 60 * 1000),
      otpAttempts: 0,
    });

    sendOTPEmail(email, otp)
      .then(() => {
        console.log("OTP email sent to:", email);
      })
      .catch((err) => {
        console.error("EMAIL FAILED:", err.message);
      });

    return res.status(201).json({
      message: "Account created. OTP sent to email.",
      userId: user._id,
    });
  } catch (err: any) {
    console.error("REGISTER ERROR:", err);

    return res.status(500).json({
      message: err.message || "Registration failed",
    });
  }
};

export const login: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    await syncAdminAccess(user._id.toString());

    if (!user.isVerified) {
      return res.status(400).json({
        message: "Please verify your email first",
      });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(403).json({
        message: "Account temporarily locked. Try later.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const profile = await Profile.findOne({ user: user._id });

    const refreshedUser = await User.findById(user._id);

    return res.json({
      token: generateToken(user._id.toString()),
      user: toSafeUser((refreshedUser || user).toObject(), {
        isTutor: profile?.isTutor,
        profilePhoto: profile?.profilePhoto,
      }),
    });
  } catch (error: any) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({ message: "Login failed" });
  }
};

export const verifyOTP: RequestHandler = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId);

    if (!user || !user.otp) {
      return res.status(400).json({ message: "Invalid request" });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(403).json({
        message: "Too many attempts. Try later.",
      });
    }

    if (!user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    const match = await bcrypt.compare(otp, user.otp);

    if (!match) {
      user.otpAttempts += 1;

      if (user.otpAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        user.otpAttempts = 0;
      }

      await user.save();

      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    user.otpAttempts = 0;
    user.lockUntil = null;

    await user.save();

    return res.json({ message: "Verified successfully" });
  } catch {
    return res.status(500).json({ message: "Verification failed" });
  }
};

export const resendOTP: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return res.status(403).json({
        message: "Account locked. Try later.",
      });
    }

    const otp = generateOTP();

    user.otp = await bcrypt.hash(otp, 10);
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.otpAttempts = 0;

    await user.save();
    await sendOTPEmail(user.email, otp);

    return res.json({ message: "OTP resent" });
  } catch {
    return res.status(500).json({ message: "Failed to resend OTP" });
  }
};

export const forgotPassword: RequestHandler = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex");

      user.passwordResetToken = hashedToken;
      user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();

      const resetLink = `${getFrontendBaseUrl(req)}/reset-password/${rawToken}`;
      await sendPasswordResetEmail(user.email, resetLink);
    }

    return res.json({
      message:
        "If an account exists for that email, a password reset link has been sent.",
    });
  } catch (error: any) {
    console.error("FORGOT PASSWORD ERROR:", error);
    return res.status(500).json({
      message: "Failed to start password reset",
    });
  }
};

export const resetPassword: RequestHandler = async (req, res) => {
  try {
    const token = String(req.body.token || "");
    const newPassword = String(req.body.newPassword || "");

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message: "This reset link is invalid or has expired",
      });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: "New password must be different from the current password",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    user.lockUntil = null;
    user.otpAttempts = 0;
    await user.save();

    return res.json({
      message: "Password reset successful. You can now sign in.",
    });
  } catch (error: any) {
    console.error("RESET PASSWORD ERROR:", error);
    return res.status(500).json({
      message: "Failed to reset password",
    });
  }
};

export const checkUsername: RequestHandler = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username || Array.isArray(username)) {
      return res.status(400).json({ message: "Username required" });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const exists = await User.findOne({ username: normalizedUsername });

    return res.json({ available: !exists });
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};

export const changePassword: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      return res.status(400).json({
        message: "New password must be different",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (error: any) {
    console.error("CHANGE PASSWORD ERROR:", error);
    return res.status(500).json({ message: "Failed to update password" });
  }
};

export const getCurrentUser: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await syncAdminAccess(user._id.toString());

    const profile = await Profile.findOne({ user: user._id });
    const refreshedUser = await User.findById(user._id);

    return res.json({
      user: toSafeUser((refreshedUser || user).toObject(), {
        isTutor: profile?.isTutor,
        profilePhoto: profile?.profilePhoto,
      }),
    });
  } catch (error: any) {
    console.error("ME ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch user" });
  }
};

export const rechargeSkillCoins: RequestHandler = async (req, res) => {
  return res.status(410).json({
    message:
      "Direct SkillCoin recharge is disabled. Use the verified payment flow.",
  });
};

export const createWalletRechargeOrder: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;
    const amount = Math.round(Number(req.body.amount));

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid recharge amount" });
    }

    const bonusSkillCoins = getRechargeBonus(amount);
    const totalSkillCoins = amount + bonusSkillCoins;

    const order = await createRazorpayOrder(amount);

    await WalletRechargeOrder.create({
      user: userId,
      amountRupees: amount,
      bonusSkillCoins,
      skillCoins: totalSkillCoins,
      razorpayOrderId: order.id,
      status: "created",
    });

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: getRazorpayConfig().keyId,
      conversion: {
        rupees: amount,
        baseSkillCoins: amount,
        bonusSkillCoins,
        skillCoins: totalSkillCoins,
        rate: "1 INR = 1 SC",
      },
      offers: RECHARGE_BONUS_OFFERS,
    });
  } catch (error: any) {
    console.error("CREATE RECHARGE ORDER ERROR:", error);
    return res.status(500).json({
      message: error.message || "Failed to create recharge order",
    });
  }
};

export const verifyWalletRecharge: RequestHandler = async (req, res) => {
  let dbSession: mongoose.ClientSession | null = null;

  try {
    const userId = req.userId;
    const razorpayOrderId = String(req.body.razorpayOrderId || "");
    const razorpayPaymentId = String(req.body.razorpayPaymentId || "");
    const razorpaySignature = String(req.body.razorpaySignature || "");

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        message: "Missing payment verification fields",
      });
    }

    const pendingRecharge = await WalletRechargeOrder.findOne({
      razorpayOrderId,
      user: userId,
    });

    if (!pendingRecharge) {
      return res.status(404).json({ message: "Recharge order not found" });
    }

    if (pendingRecharge.status === "paid") {
      const existingUser = await User.findById(userId);

      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json({
        wallet: buildWalletSummary(existingUser),
      });
    }

    const isValid = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) {
      pendingRecharge.status = "failed";
      await pendingRecharge.save();

      return res.status(400).json({
        message: "Payment signature verification failed",
      });
    }

    dbSession = await mongoose.startSession();

    let wallet:
      | {
          skillCoinBalance: number;
          lockedSkillCoins: number;
          availableSkillCoins: number;
        }
      | null = null;

    await dbSession.withTransaction(async () => {
      const order = await WalletRechargeOrder.findOne({
        razorpayOrderId,
        user: userId,
      }).session(dbSession);

      if (!order) {
        throw new Error("Recharge order not found");
      }

      const user = await User.findById(userId).session(dbSession);

      if (!user) {
        throw new Error("User not found");
      }

      if (order.status === "paid") {
        wallet = buildWalletSummary(user);
        return;
      }

      order.status = "paid";
      order.razorpayPaymentId = razorpayPaymentId;
      order.razorpaySignature = razorpaySignature;
      await order.save({ session: dbSession! });

      wallet = await creditSkillCoins(
        user,
        order.skillCoins,
        order.bonusSkillCoins
          ? `SkillCoin recharge completed through Razorpay (+${order.bonusSkillCoins} bonus SC)`
          : "SkillCoin recharge completed through Razorpay",
        {
          extra: {
            razorpayOrderId,
            razorpayPaymentId,
            rupees: order.amountRupees,
            bonusSkillCoins: order.bonusSkillCoins,
            skillCoins: order.skillCoins,
          },
        },
        dbSession!
      );
    });

    if (!wallet) {
      return res.status(500).json({
        message: "Failed to credit SkillCoin wallet",
      });
    }

    emitWalletUpdate(userId, wallet);

    return res.json({ wallet });
  } catch (error: any) {
    console.error("VERIFY RECHARGE ERROR:", error);
    return res.status(500).json({
      message: error.message || "Failed to verify recharge payment",
    });
  } finally {
    await dbSession?.endSession();
  }
};

export const getWalletTransactions: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const transactions = await getRecentWalletTransactions(userId);

    return res.json(
      transactions.map((transaction: any) => ({
        _id: transaction._id.toString(),
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        createdAt: transaction.createdAt,
        auditStatus: transaction.auditStatus || "pending",
        hash: transaction.hash,
        chainTxHash: transaction.chainTxHash || null,
        chainName: transaction.chainName || null,
        network: transaction.network || null,
      }))
    );
  } catch (error: any) {
    console.error("WALLET HISTORY ERROR:", error);
    return res.status(500).json({
      message: "Failed to fetch wallet history",
    });
  }
};

export const requestWithdrawal: RequestHandler = async (req, res) => {
  let dbSession: mongoose.ClientSession | null = null;

  try {
    const userId = req.userId;
    const amount = Math.round(Number(req.body.amount));
    const upiId = String(req.body.upiId || "").trim().toLowerCase();
    const note = String(req.body.note || "").trim();

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid withdrawal amount" });
    }

    if (!upiId) {
      return res.status(400).json({ message: "UPI ID is required" });
    }

    dbSession = await mongoose.startSession();
    let wallet: ReturnType<typeof buildWalletSummary> | null = null;
    let request: any = null;

    await dbSession.withTransaction(async () => {
      const user = await User.findById(userId).session(dbSession);

      if (!user) {
        throw new Error("User not found");
      }

      await lockSkillCoins(
        user,
        amount,
        `SkillCoin locked for withdrawal request to ${upiId}`,
        {
          extra: {
            upiId,
            note,
          },
        },
        dbSession || undefined,
        "withdrawal_lock"
      );

      const [createdRequest] = await WithdrawalRequest.create(
        [
          {
            user: user._id,
            amount,
            upiId,
            note,
            status: "pending",
          },
        ],
        { session: dbSession }
      );

      request = createdRequest;
      wallet = buildWalletSummary(user);
    });

    if (!wallet || !request) {
      return res.status(500).json({ message: "Failed to create withdrawal request" });
    }

    emitWalletUpdate(userId, wallet);

    return res.status(201).json({
      message: "Withdrawal request submitted",
      wallet,
      request: {
        _id: request._id.toString(),
        amount: request.amount,
        upiId: request.upiId,
        note: request.note || "",
        status: request.status,
        createdAt: request.createdAt,
      },
    });
  } catch (error: any) {
    console.error("REQUEST WITHDRAWAL ERROR:", error);
    return res.status(500).json({
      message: error?.message || "Failed to create withdrawal request",
    });
  } finally {
    await dbSession?.endSession();
  }
};

export const getMyWithdrawalRequests: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const requests = await WithdrawalRequest.find({
      user: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json(
      requests.map((request) => ({
        _id: request._id.toString(),
        amount: request.amount,
        upiId: request.upiId,
        note: request.note || "",
        status: request.status,
        adminNote: request.adminNote || "",
        reviewedAt: request.reviewedAt || null,
        paidAt: request.paidAt || null,
        createdAt: request.createdAt,
      }))
    );
  } catch (error: any) {
    console.error("GET WITHDRAWALS ERROR:", error);
    return res.status(500).json({
      message: "Failed to fetch withdrawal requests",
    });
  }
};

export const getWalletProof: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;
    const transactionId = String(req.params.transactionId || "");

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const proof = await getWalletTransactionProof(transactionId, userId);

    if (!proof) {
      return res.status(404).json({
        message: "Wallet transaction proof not found",
      });
    }

    return res.json(proof);
  } catch (error: any) {
    console.error("WALLET PROOF ERROR:", error);
    return res.status(500).json({
      message: "Failed to fetch wallet proof",
    });
  }
};

export const getPendingAdminGift: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const gift = await AdminGift.findOne({
      recipient: userId,
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!gift) {
      return res.json({ gift: null });
    }

    return res.json({
      gift: {
        _id: gift._id.toString(),
        amount: gift.amount,
        note: gift.note || "",
        createdAt: (gift as any).createdAt,
      },
    });
  } catch (error: any) {
    console.error("PENDING ADMIN GIFT ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch pending admin gift" });
  }
};

export const claimAdminGift: RequestHandler = async (req, res) => {
  let dbSession: mongoose.ClientSession | null = null;

  try {
    const userId = req.userId;
    const giftId = String(req.params.giftId || "");

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!mongoose.Types.ObjectId.isValid(giftId)) {
      return res.status(400).json({ message: "Invalid gift ID" });
    }

    dbSession = await mongoose.startSession();
    let wallet = null;
    let claimedGift: any = null;

    await dbSession.withTransaction(async () => {
      const gift = await AdminGift.findOne({
        _id: giftId,
        recipient: userId,
      }).session(dbSession);

      if (!gift) {
        throw new Error("Gift not found");
      }

      if (gift.status === "claimed") {
        throw new Error("Gift already claimed");
      }

      const user = await User.findById(userId).session(dbSession);

      if (!user) {
        throw new Error("User not found");
      }

      wallet = await creditSkillCoins(
        user,
        gift.amount,
        gift.note
          ? `Admin gift claimed (+${gift.amount} SC): ${gift.note}`
          : `Admin gift claimed (+${gift.amount} SC)`,
        {
          extra: {
            giftId: gift._id.toString(),
            senderAdminId: gift.senderAdmin.toString(),
            note: gift.note || "",
          },
        },
        dbSession || undefined
      );

      gift.status = "claimed";
      gift.claimedAt = new Date();
      await gift.save({ session: dbSession });
      claimedGift = gift;
    });

    if (!wallet || !claimedGift) {
      return res.status(500).json({ message: "Failed to claim admin gift" });
    }

    await Activity.updateMany(
      {
        user: new mongoose.Types.ObjectId(userId),
        action: "ADMIN_GIFT",
        "metadata.giftId": claimedGift._id.toString(),
      },
      {
        $set: {
          isRead: true,
        },
      }
    );

    emitWalletUpdate(userId, wallet);

    return res.json({
      message: "Gift claimed successfully",
      wallet,
      gift: {
        _id: claimedGift._id.toString(),
        amount: claimedGift.amount,
        note: claimedGift.note || "",
      },
    });
  } catch (error: any) {
    console.error("CLAIM ADMIN GIFT ERROR:", error);
    return res.status(500).json({
      message: error?.message || "Failed to claim admin gift",
    });
  } finally {
    await dbSession?.endSession();
  }
};

export const deleteAccount: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { currentPassword, confirmationText } = req.body;

    if (confirmationText !== "DELETE MY ACCOUNT") {
      return res.status(400).json({
        message: "Confirmation text did not match",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const affectedCourseIds = await CourseReview.distinct("course", {
      user: user._id,
    });

    await Promise.all([
      Activity.deleteMany({ user: user._id }),
      Session.deleteMany({
        $or: [{ student: user._id }, { tutor: user._id }],
      }),
      Profile.deleteOne({ user: user._id }),
      Course.deleteMany({ tutor: user._id }),
      CourseReview.deleteMany({ user: user._id }),
      WithdrawalRequest.deleteMany({ user: user._id }),
      Course.updateMany(
        {},
        {
          $pull: {
            savedBy: user._id,
          },
        }
      ),
    ]);

    for (const courseId of affectedCourseIds) {
      const [summary] = await CourseReview.aggregate<{
        _id: mongoose.Types.ObjectId;
        totalRatings: number;
        averageRating: number;
      }>([
        {
          $match: {
            course: new mongoose.Types.ObjectId(courseId),
          },
        },
        {
          $group: {
            _id: "$course",
            totalRatings: { $sum: 1 },
            averageRating: { $avg: "$rating" },
          },
        },
      ]);

      await Course.findByIdAndUpdate(courseId, {
        totalRatings: summary?.totalRatings || 0,
        averageRating: summary?.totalRatings
          ? Number(summary.averageRating.toFixed(1))
          : 0,
      });
    }

    await user.deleteOne();

    return res.json({ message: "Account deleted successfully" });
  } catch (error: any) {
    console.error("DELETE ACCOUNT ERROR:", error);
    return res.status(500).json({ message: "Failed to delete account" });
  }
};
