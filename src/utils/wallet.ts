import mongoose from "mongoose";
import User, { type IUser } from "../models/User.js";
import WalletTransaction from "../models/WalletTransaction.js";

type WalletTransactionInput = {
  userId: mongoose.Types.ObjectId | string;
  type:
    | "recharge"
    | "session_lock"
    | "session_unlock"
    | "session_spend"
    | "session_earn";
  amount: number;
  balanceAfter: number;
  lockedAfter: number;
  description: string;
  sessionId?: mongoose.Types.ObjectId | string;
  courseId?: mongoose.Types.ObjectId | string;
  metadata?: Record<string, unknown>;
};

export const getAvailableSkillCoins = (
  user: Pick<IUser, "skillCoinBalance" | "lockedSkillCoins">
) => Math.max(0, (user.skillCoinBalance || 0) - (user.lockedSkillCoins || 0));

export const buildWalletSummary = (
  user: Pick<IUser, "skillCoinBalance" | "lockedSkillCoins">
) => ({
  skillCoinBalance: user.skillCoinBalance || 0,
  lockedSkillCoins: user.lockedSkillCoins || 0,
  availableSkillCoins: getAvailableSkillCoins(user),
});

export const recordWalletTransaction = async ({
  userId,
  type,
  amount,
  balanceAfter,
  lockedAfter,
  description,
  sessionId,
  courseId,
  metadata,
}: WalletTransactionInput) => {
  await WalletTransaction.create({
    user: new mongoose.Types.ObjectId(userId),
    type,
    amount,
    balanceAfter,
    lockedAfter,
    description,
    ...(sessionId
      ? { session: new mongoose.Types.ObjectId(sessionId) }
      : {}),
    ...(courseId ? { course: new mongoose.Types.ObjectId(courseId) } : {}),
    ...(metadata ? { metadata } : {}),
  });
};

export const creditSkillCoins = async (
  user: IUser,
  amount: number,
  description: string,
  metadata?: {
    sessionId?: mongoose.Types.ObjectId | string;
    courseId?: mongoose.Types.ObjectId | string;
    extra?: Record<string, unknown>;
  }
) => {
  user.skillCoinBalance += amount;
  await user.save();

  await recordWalletTransaction({
    userId: user._id,
    type: "recharge",
    amount,
    balanceAfter: user.skillCoinBalance,
    lockedAfter: user.lockedSkillCoins,
    description,
    ...(metadata?.sessionId ? { sessionId: metadata.sessionId } : {}),
    ...(metadata?.courseId ? { courseId: metadata.courseId } : {}),
    ...(metadata?.extra ? { metadata: metadata.extra } : {}),
  });

  return buildWalletSummary(user);
};

export const lockSkillCoins = async (
  user: IUser,
  amount: number,
  description: string,
  metadata?: {
    sessionId?: mongoose.Types.ObjectId | string;
    courseId?: mongoose.Types.ObjectId | string;
    extra?: Record<string, unknown>;
  }
) => {
  if (getAvailableSkillCoins(user) < amount) {
    throw new Error("Insufficient SkillCoin balance");
  }

  user.lockedSkillCoins += amount;
  await user.save();

  await recordWalletTransaction({
    userId: user._id,
    type: "session_lock",
    amount: -amount,
    balanceAfter: user.skillCoinBalance,
    lockedAfter: user.lockedSkillCoins,
    description,
    ...(metadata?.sessionId ? { sessionId: metadata.sessionId } : {}),
    ...(metadata?.courseId ? { courseId: metadata.courseId } : {}),
    ...(metadata?.extra ? { metadata: metadata.extra } : {}),
  });

  return buildWalletSummary(user);
};

export const unlockSkillCoins = async (
  user: IUser,
  amount: number,
  description: string,
  metadata?: {
    sessionId?: mongoose.Types.ObjectId | string;
    courseId?: mongoose.Types.ObjectId | string;
    extra?: Record<string, unknown>;
  }
) => {
  user.lockedSkillCoins = Math.max(0, user.lockedSkillCoins - amount);
  await user.save();

  await recordWalletTransaction({
    userId: user._id,
    type: "session_unlock",
    amount,
    balanceAfter: user.skillCoinBalance,
    lockedAfter: user.lockedSkillCoins,
    description,
    ...(metadata?.sessionId ? { sessionId: metadata.sessionId } : {}),
    ...(metadata?.courseId ? { courseId: metadata.courseId } : {}),
    ...(metadata?.extra ? { metadata: metadata.extra } : {}),
  });

  return buildWalletSummary(user);
};

export const settleLockedSkillCoins = async ({
  student,
  tutor,
  amount,
  sessionId,
  courseId,
  description,
}: {
  student: IUser;
  tutor: IUser;
  amount: number;
  sessionId?: mongoose.Types.ObjectId | string;
  courseId?: mongoose.Types.ObjectId | string;
  description: string;
}) => {
  student.lockedSkillCoins = Math.max(0, student.lockedSkillCoins - amount);
  student.skillCoinBalance = Math.max(0, student.skillCoinBalance - amount);
  tutor.skillCoinBalance += amount;

  await student.save();
  await tutor.save();

  await Promise.all([
    recordWalletTransaction({
      userId: student._id,
      type: "session_spend",
      amount: -amount,
      balanceAfter: student.skillCoinBalance,
      lockedAfter: student.lockedSkillCoins,
      description,
      ...(sessionId ? { sessionId } : {}),
      ...(courseId ? { courseId } : {}),
    }),
    recordWalletTransaction({
      userId: tutor._id,
      type: "session_earn",
      amount,
      balanceAfter: tutor.skillCoinBalance,
      lockedAfter: tutor.lockedSkillCoins,
      description,
      ...(sessionId ? { sessionId } : {}),
      ...(courseId ? { courseId } : {}),
    }),
  ]);

  return {
    student: buildWalletSummary(student),
    tutor: buildWalletSummary(tutor),
  };
};

export const getRecentWalletTransactions = async (userId: string) =>
  WalletTransaction.find({
    user: new mongoose.Types.ObjectId(userId),
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
