import mongoose, { Document } from "mongoose";
export interface IAdminGift extends Document {
    recipient: mongoose.Types.ObjectId;
    senderAdmin: mongoose.Types.ObjectId;
    amount: number;
    note?: string;
    status: "pending" | "claimed";
    claimedAt?: Date | null;
}
declare const _default: mongoose.Model<IAdminGift, {}, {}, {}, mongoose.Document<unknown, {}, IAdminGift, {}, mongoose.DefaultSchemaOptions> & IAdminGift & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IAdminGift>;
export default _default;
//# sourceMappingURL=AdminGift.d.ts.map