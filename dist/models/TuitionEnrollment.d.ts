import mongoose, { Document } from "mongoose";
export interface ITuitionEnrollment extends Document {
    course: mongoose.Types.ObjectId;
    student: mongoose.Types.ObjectId;
    tutor: mongoose.Types.ObjectId;
    price: number;
    skillCoinAmount: number;
    status: "pending" | "approved" | "paused" | "rejected" | "cancelled";
    coinStatus: "locked" | "settled" | "released";
    generatedUntil?: Date | null;
    approvedAt?: Date | null;
    pausedAt?: Date | null;
    rejectedAt?: Date | null;
    cancelledAt?: Date | null;
    scheduleSnapshot: {
        days: string[];
        weeks: number[];
        startTime: string;
        duration: string;
        durationMinutes: number;
    };
}
declare const _default: mongoose.Model<ITuitionEnrollment, {}, {}, {}, mongoose.Document<unknown, {}, ITuitionEnrollment, {}, mongoose.DefaultSchemaOptions> & ITuitionEnrollment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ITuitionEnrollment>;
export default _default;
//# sourceMappingURL=TuitionEnrollment.d.ts.map