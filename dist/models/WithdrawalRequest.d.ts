import mongoose, { Document } from "mongoose";
export interface IWithdrawalRequest extends Document {
    user: mongoose.Types.ObjectId;
    amount: number;
    upiId: string;
    note?: string;
    status: "pending" | "processing" | "paid" | "rejected";
    reviewedBy?: mongoose.Types.ObjectId | null;
    reviewedAt?: Date | null;
    adminNote?: string | null;
    paidAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IWithdrawalRequest, {}, {}, {}, mongoose.Document<unknown, {}, IWithdrawalRequest, {}, mongoose.DefaultSchemaOptions> & IWithdrawalRequest & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IWithdrawalRequest>;
export default _default;
//# sourceMappingURL=WithdrawalRequest.d.ts.map