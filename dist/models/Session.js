import mongoose, { Schema, Document } from "mongoose";
const SessionSchema = new Schema({
    course: {
        type: Schema.Types.ObjectId,
        ref: "Course",
    },
    tuitionEnrollment: {
        type: Schema.Types.ObjectId,
        ref: "TuitionEnrollment",
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
    title: { type: String, required: true },
    description: String,
    date: { type: Date, required: true },
    duration: { type: Number, required: true },
    acceptedAt: Date,
    tutorMarkedCompletedAt: Date,
    studentConfirmedCompletionAt: Date,
    status: {
        type: String,
        enum: ["pending", "accepted", "completed", "cancelled"],
        default: "pending",
    },
    hiddenFor: {
        type: [Schema.Types.ObjectId],
        ref: "User",
        default: [],
    },
    skillCoinAmount: {
        type: Number,
        required: true,
        min: 0,
    },
    coinStatus: {
        type: String,
        enum: ["locked", "released", "settled"],
        default: "locked",
    },
    sessionKind: {
        type: String,
        enum: ["single", "tuition"],
        default: "single",
    },
    billingType: {
        type: String,
        enum: ["pay_per_session", "included_in_tuition"],
        default: "pay_per_session",
    },
    price: { type: Number, required: true },
}, { timestamps: true });
export default mongoose.model("Session", SessionSchema);
//# sourceMappingURL=Session.js.map