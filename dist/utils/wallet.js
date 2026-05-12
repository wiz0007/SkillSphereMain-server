import mongoose from "mongoose";
import User, {} from "../models/User.js";
import WalletTransaction from "../models/WalletTransaction.js";
import { buildCanonicalWalletPayload, hashWalletPayload, } from "./auditHash.js";
export const getAvailableSkillCoins = (user) => Math.max(0, (user.skillCoinBalance || 0) - (user.lockedSkillCoins || 0));
export const buildWalletSummary = (user) => ({
    skillCoinBalance: user.skillCoinBalance || 0,
    lockedSkillCoins: user.lockedSkillCoins || 0,
    availableSkillCoins: getAvailableSkillCoins(user),
});
export const recordWalletTransaction = async ({ userId, type, amount, balanceAfter, lockedAfter, description, sessionId, courseId, metadata, dbSession, }) => {
    const lastTransaction = await WalletTransaction.findOne({
        user: new mongoose.Types.ObjectId(userId),
    })
        .session(dbSession || null)
        .sort({ createdAt: -1, _id: -1 })
        .select("hash")
        .lean();
    const previousHash = lastTransaction?.hash || null;
    const createdAt = new Date().toISOString();
    const canonicalPayload = buildCanonicalWalletPayload({
        userId: new mongoose.Types.ObjectId(userId).toString(),
        type,
        amount,
        balanceAfter,
        lockedAfter,
        description,
        createdAt,
        previousHash,
        ...(sessionId ? { sessionId: String(sessionId) } : {}),
        ...(courseId ? { courseId: String(courseId) } : {}),
        ...(metadata ? { metadata } : {}),
    });
    const hash = hashWalletPayload(canonicalPayload);
    await WalletTransaction.create([
        {
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
            hash,
            previousHash,
            canonicalPayload,
            auditStatus: "pending",
        },
    ], dbSession ? { session: dbSession } : undefined);
};
export const creditSkillCoins = async (user, amount, description, metadata, dbSession) => {
    user.skillCoinBalance += amount;
    await user.save(dbSession ? { session: dbSession } : undefined);
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
        ...(dbSession ? { dbSession } : {}),
    });
    return buildWalletSummary(user);
};
export const lockSkillCoins = async (user, amount, description, metadata, dbSession, transactionType = "session_lock") => {
    if (getAvailableSkillCoins(user) < amount) {
        throw new Error("Insufficient SkillCoin balance");
    }
    user.lockedSkillCoins += amount;
    await user.save(dbSession ? { session: dbSession } : undefined);
    await recordWalletTransaction({
        userId: user._id,
        type: transactionType,
        amount: -amount,
        balanceAfter: user.skillCoinBalance,
        lockedAfter: user.lockedSkillCoins,
        description,
        ...(metadata?.sessionId ? { sessionId: metadata.sessionId } : {}),
        ...(metadata?.courseId ? { courseId: metadata.courseId } : {}),
        ...(metadata?.extra ? { metadata: metadata.extra } : {}),
        ...(dbSession ? { dbSession } : {}),
    });
    return buildWalletSummary(user);
};
export const unlockSkillCoins = async (user, amount, description, metadata, dbSession, transactionType = "session_unlock") => {
    user.lockedSkillCoins = Math.max(0, user.lockedSkillCoins - amount);
    await user.save(dbSession ? { session: dbSession } : undefined);
    await recordWalletTransaction({
        userId: user._id,
        type: transactionType,
        amount,
        balanceAfter: user.skillCoinBalance,
        lockedAfter: user.lockedSkillCoins,
        description,
        ...(metadata?.sessionId ? { sessionId: metadata.sessionId } : {}),
        ...(metadata?.courseId ? { courseId: metadata.courseId } : {}),
        ...(metadata?.extra ? { metadata: metadata.extra } : {}),
        ...(dbSession ? { dbSession } : {}),
    });
    return buildWalletSummary(user);
};
export const settleLockedSkillCoins = async ({ student, tutor, amount, sessionId, courseId, description, dbSession, studentTransactionType = "session_spend", tutorTransactionType = "session_earn", }) => {
    if (student.lockedSkillCoins < amount || student.skillCoinBalance < amount) {
        throw new Error("Student wallet balance is inconsistent for settlement");
    }
    student.lockedSkillCoins = Math.max(0, student.lockedSkillCoins - amount);
    student.skillCoinBalance = Math.max(0, student.skillCoinBalance - amount);
    tutor.skillCoinBalance += amount;
    await student.save(dbSession ? { session: dbSession } : undefined);
    await tutor.save(dbSession ? { session: dbSession } : undefined);
    await Promise.all([
        recordWalletTransaction({
            userId: student._id,
            type: studentTransactionType,
            amount: -amount,
            balanceAfter: student.skillCoinBalance,
            lockedAfter: student.lockedSkillCoins,
            description,
            ...(sessionId ? { sessionId } : {}),
            ...(courseId ? { courseId } : {}),
            ...(dbSession ? { dbSession } : {}),
        }),
        recordWalletTransaction({
            userId: tutor._id,
            type: tutorTransactionType,
            amount,
            balanceAfter: tutor.skillCoinBalance,
            lockedAfter: tutor.lockedSkillCoins,
            description,
            ...(sessionId ? { sessionId } : {}),
            ...(courseId ? { courseId } : {}),
            ...(dbSession ? { dbSession } : {}),
        }),
    ]);
    return {
        student: buildWalletSummary(student),
        tutor: buildWalletSummary(tutor),
    };
};
export const getRecentWalletTransactions = async (userId) => WalletTransaction.find({
    user: new mongoose.Types.ObjectId(userId),
})
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
//# sourceMappingURL=wallet.js.map