import mongoose, { Document } from "mongoose";
export interface IWalletTransaction extends Document {
    user: mongoose.Types.ObjectId;
    type: "recharge" | "admin_credit" | "admin_debit" | "session_lock" | "session_unlock" | "session_spend" | "session_earn" | "tuition_lock" | "tuition_unlock" | "tuition_spend" | "tuition_earn" | "recorded_course_lock" | "recorded_course_unlock" | "recorded_course_spend" | "recorded_course_earn";
    amount: number;
    balanceAfter: number;
    lockedAfter: number;
    description: string;
    session?: mongoose.Types.ObjectId;
    course?: mongoose.Types.ObjectId;
    metadata?: Record<string, unknown>;
    hash: string;
    previousHash?: string | null;
    canonicalPayload: string;
    auditStatus: "pending" | "anchored" | "failed";
    anchorBatchId?: mongoose.Types.ObjectId;
    anchorRoot?: string;
    anchoredAt?: Date;
    chainTxHash?: string;
    chainName?: string;
    network?: string;
    proofPath?: string[];
}
declare const _default: mongoose.Model<IWalletTransaction, {}, {}, {}, mongoose.Document<unknown, {}, IWalletTransaction, {}, mongoose.DefaultSchemaOptions> & IWalletTransaction & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IWalletTransaction>;
export default _default;
//# sourceMappingURL=WalletTransaction.d.ts.map