import mongoose, { Document } from "mongoose";
export interface IWalletRechargeOrder extends Document {
    user: mongoose.Types.ObjectId;
    amountRupees: number;
    bonusSkillCoins: number;
    skillCoins: number;
    razorpayOrderId: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    status: "created" | "paid" | "failed";
}
declare const _default: mongoose.Model<IWalletRechargeOrder, {}, {}, {}, mongoose.Document<unknown, {}, IWalletRechargeOrder, {}, mongoose.DefaultSchemaOptions> & IWalletRechargeOrder & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IWalletRechargeOrder>;
export default _default;
//# sourceMappingURL=WalletRechargeOrder.d.ts.map