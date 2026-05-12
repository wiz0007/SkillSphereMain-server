import mongoose, { Document, Schema } from "mongoose";
const RecordedCourseAccessSchema = new Schema({
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
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    coinStatus: {
        type: String,
        enum: ["locked", "settled", "released"],
        default: "locked",
    },
    approvedAt: {
        type: Date,
        default: null,
    },
    rejectedAt: {
        type: Date,
        default: null,
    },
    unlockedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });
RecordedCourseAccessSchema.index({ course: 1, student: 1 }, { unique: true });
export default mongoose.model("RecordedCourseAccess", RecordedCourseAccessSchema);
//# sourceMappingURL=RecordedCourseAccess.js.map