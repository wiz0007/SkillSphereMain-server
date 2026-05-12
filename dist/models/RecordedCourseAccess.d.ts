import mongoose, { Document } from "mongoose";
export interface IRecordedCourseAccess extends Document {
    course: mongoose.Types.ObjectId;
    student: mongoose.Types.ObjectId;
    tutor: mongoose.Types.ObjectId;
    price: number;
    skillCoinAmount: number;
    status: "pending" | "approved" | "rejected";
    coinStatus: "locked" | "settled" | "released";
    approvedAt?: Date | null;
    rejectedAt?: Date | null;
    unlockedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IRecordedCourseAccess, {}, {}, {}, mongoose.Document<unknown, {}, IRecordedCourseAccess, {}, mongoose.DefaultSchemaOptions> & IRecordedCourseAccess & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IRecordedCourseAccess>;
export default _default;
//# sourceMappingURL=RecordedCourseAccess.d.ts.map