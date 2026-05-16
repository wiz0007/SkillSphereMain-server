import mongoose, { Document } from "mongoose";
export interface ISession extends Document {
    course?: mongoose.Types.ObjectId;
    tuitionEnrollment?: mongoose.Types.ObjectId;
    student: mongoose.Types.ObjectId;
    tutor: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    date: Date;
    duration: number;
    acceptedAt?: Date;
    tutorMarkedCompletedAt?: Date;
    studentConfirmedCompletionAt?: Date;
    hiddenFor: mongoose.Types.ObjectId[];
    skillCoinAmount: number;
    coinStatus: "locked" | "released" | "settled";
    sessionKind: "single" | "tuition";
    billingType: "pay_per_session" | "included_in_tuition";
    status: "pending" | "accepted" | "completed" | "cancelled";
    price: number;
}
declare const _default: mongoose.Model<ISession, {}, {}, {}, mongoose.Document<unknown, {}, ISession, {}, mongoose.DefaultSchemaOptions> & ISession & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ISession>;
export default _default;
//# sourceMappingURL=Session.d.ts.map