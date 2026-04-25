import mongoose, { Document } from "mongoose";
export interface ISession extends Document {
    student: mongoose.Types.ObjectId;
    tutor: mongoose.Types.ObjectId;
    title: string;
    description?: string;
    date: Date;
    duration: number;
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