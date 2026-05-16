import mongoose, { Document, Schema } from "mongoose";
const TuitionScheduleSnapshotSchema = new Schema({
    days: {
        type: [String],
        default: [],
    },
    weeks: {
        type: [Number],
        default: [],
    },
    startTime: {
        type: String,
        default: "",
        trim: true,
    },
    duration: {
        type: String,
        default: "",
        trim: true,
    },
    durationMinutes: {
        type: Number,
        default: 0,
        min: 0,
    },
}, { _id: false });
const TuitionEnrollmentSchema = new Schema({
    course: {
        type: Schema.Types.ObjectId,
        ref: "Course",
        required: true,
    },
    student: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    tutor: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    price: {
        type: Number,
        required: true,
        min: 0,
    },
    skillCoinAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    status: {
        type: String,
        enum: ["pending", "approved", "paused", "rejected", "cancelled"],
        default: "pending",
    },
    coinStatus: {
        type: String,
        enum: ["locked", "settled", "released"],
        default: "locked",
    },
    generatedUntil: {
        type: Date,
        default: null,
    },
    approvedAt: {
        type: Date,
        default: null,
    },
    pausedAt: {
        type: Date,
        default: null,
    },
    rejectedAt: {
        type: Date,
        default: null,
    },
    cancelledAt: {
        type: Date,
        default: null,
    },
    scheduleSnapshot: {
        type: TuitionScheduleSnapshotSchema,
        required: true,
    },
}, { timestamps: true });
TuitionEnrollmentSchema.index({ course: 1, student: 1 }, { unique: true });
export default mongoose.model("TuitionEnrollment", TuitionEnrollmentSchema);
//# sourceMappingURL=TuitionEnrollment.js.map