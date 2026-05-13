import mongoose from "mongoose";
import { type IUser } from "../models/User.js";
type WalletTransactionInput = {
    userId: mongoose.Types.ObjectId | string;
    type: "recharge" | "admin_credit" | "admin_debit" | "session_lock" | "session_unlock" | "session_spend" | "session_earn" | "recorded_course_lock" | "recorded_course_unlock" | "recorded_course_spend" | "recorded_course_earn";
    amount: number;
    balanceAfter: number;
    lockedAfter: number;
    description: string;
    sessionId?: mongoose.Types.ObjectId | string;
    courseId?: mongoose.Types.ObjectId | string;
    metadata?: Record<string, unknown>;
    dbSession?: mongoose.ClientSession;
};
export declare const getAvailableSkillCoins: (user: Pick<IUser, "skillCoinBalance" | "lockedSkillCoins">) => number;
export declare const buildWalletSummary: (user: Pick<IUser, "skillCoinBalance" | "lockedSkillCoins">) => {
    skillCoinBalance: number;
    lockedSkillCoins: number;
    availableSkillCoins: number;
};
export declare const recordWalletTransaction: ({ userId, type, amount, balanceAfter, lockedAfter, description, sessionId, courseId, metadata, dbSession, }: WalletTransactionInput) => Promise<void>;
export declare const creditSkillCoins: (user: IUser, amount: number, description: string, metadata?: {
    sessionId?: mongoose.Types.ObjectId | string;
    courseId?: mongoose.Types.ObjectId | string;
    extra?: Record<string, unknown>;
}, dbSession?: mongoose.ClientSession) => Promise<{
    skillCoinBalance: number;
    lockedSkillCoins: number;
    availableSkillCoins: number;
}>;
export declare const debitSkillCoins: (user: IUser, amount: number, description: string, metadata?: {
    sessionId?: mongoose.Types.ObjectId | string;
    courseId?: mongoose.Types.ObjectId | string;
    extra?: Record<string, unknown>;
}, dbSession?: mongoose.ClientSession) => Promise<{
    skillCoinBalance: number;
    lockedSkillCoins: number;
    availableSkillCoins: number;
}>;
export declare const lockSkillCoins: (user: IUser, amount: number, description: string, metadata?: {
    sessionId?: mongoose.Types.ObjectId | string;
    courseId?: mongoose.Types.ObjectId | string;
    extra?: Record<string, unknown>;
}, dbSession?: mongoose.ClientSession, transactionType?: "session_lock" | "recorded_course_lock") => Promise<{
    skillCoinBalance: number;
    lockedSkillCoins: number;
    availableSkillCoins: number;
}>;
export declare const unlockSkillCoins: (user: IUser, amount: number, description: string, metadata?: {
    sessionId?: mongoose.Types.ObjectId | string;
    courseId?: mongoose.Types.ObjectId | string;
    extra?: Record<string, unknown>;
}, dbSession?: mongoose.ClientSession, transactionType?: "session_unlock" | "recorded_course_unlock") => Promise<{
    skillCoinBalance: number;
    lockedSkillCoins: number;
    availableSkillCoins: number;
}>;
export declare const settleLockedSkillCoins: ({ student, tutor, amount, sessionId, courseId, description, dbSession, studentTransactionType, tutorTransactionType, }: {
    student: IUser;
    tutor: IUser;
    amount: number;
    sessionId?: mongoose.Types.ObjectId | string;
    courseId?: mongoose.Types.ObjectId | string;
    description: string;
    dbSession?: mongoose.ClientSession;
    studentTransactionType?: "session_spend" | "recorded_course_spend";
    tutorTransactionType?: "session_earn" | "recorded_course_earn";
}) => Promise<{
    student: {
        skillCoinBalance: number;
        lockedSkillCoins: number;
        availableSkillCoins: number;
    };
    tutor: {
        skillCoinBalance: number;
        lockedSkillCoins: number;
        availableSkillCoins: number;
    };
}>;
export declare const getRecentWalletTransactions: (userId: string) => Promise<(import("../models/WalletTransaction.js").IWalletTransaction & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
})[]>;
export {};
//# sourceMappingURL=wallet.d.ts.map