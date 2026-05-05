import mongoose from "mongoose";
import { type IUser } from "../models/User.js";
type WalletTransactionInput = {
    userId: mongoose.Types.ObjectId | string;
    type: "recharge" | "session_lock" | "session_unlock" | "session_spend" | "session_earn";
    amount: number;
    balanceAfter: number;
    lockedAfter: number;
    description: string;
    sessionId?: mongoose.Types.ObjectId | string;
    courseId?: mongoose.Types.ObjectId | string;
    metadata?: Record<string, unknown>;
};
export declare const getAvailableSkillCoins: (user: Pick<IUser, "skillCoinBalance" | "lockedSkillCoins">) => number;
export declare const buildWalletSummary: (user: Pick<IUser, "skillCoinBalance" | "lockedSkillCoins">) => {
    skillCoinBalance: number;
    lockedSkillCoins: number;
    availableSkillCoins: number;
};
export declare const recordWalletTransaction: ({ userId, type, amount, balanceAfter, lockedAfter, description, sessionId, courseId, metadata, }: WalletTransactionInput) => Promise<void>;
export declare const creditSkillCoins: (user: IUser, amount: number, description: string, metadata?: {
    sessionId?: mongoose.Types.ObjectId | string;
    courseId?: mongoose.Types.ObjectId | string;
    extra?: Record<string, unknown>;
}) => Promise<{
    skillCoinBalance: number;
    lockedSkillCoins: number;
    availableSkillCoins: number;
}>;
export declare const lockSkillCoins: (user: IUser, amount: number, description: string, metadata?: {
    sessionId?: mongoose.Types.ObjectId | string;
    courseId?: mongoose.Types.ObjectId | string;
    extra?: Record<string, unknown>;
}) => Promise<{
    skillCoinBalance: number;
    lockedSkillCoins: number;
    availableSkillCoins: number;
}>;
export declare const unlockSkillCoins: (user: IUser, amount: number, description: string, metadata?: {
    sessionId?: mongoose.Types.ObjectId | string;
    courseId?: mongoose.Types.ObjectId | string;
    extra?: Record<string, unknown>;
}) => Promise<{
    skillCoinBalance: number;
    lockedSkillCoins: number;
    availableSkillCoins: number;
}>;
export declare const settleLockedSkillCoins: ({ student, tutor, amount, sessionId, courseId, description, }: {
    student: IUser;
    tutor: IUser;
    amount: number;
    sessionId?: mongoose.Types.ObjectId | string;
    courseId?: mongoose.Types.ObjectId | string;
    description: string;
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