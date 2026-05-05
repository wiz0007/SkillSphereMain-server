import mongoose, { Document } from "mongoose";
export interface IWalletTransaction extends Document {
    user: mongoose.Types.ObjectId;
    type: "recharge" | "session_lock" | "session_unlock" | "session_spend" | "session_earn";
    amount: number;
    balanceAfter: number;
    lockedAfter: number;
    description: string;
    session?: mongoose.Types.ObjectId;
    course?: mongoose.Types.ObjectId;
    metadata?: Record<string, unknown>;
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