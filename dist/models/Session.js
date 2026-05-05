import mongoose, { Schema, Document } from "mongoose";
const SessionSchema = new Schema({
    course: {
        type: Schema.Types.ObjectId,
        ref: "Course",
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
    price: { type: Number, required: true },
}, { timestamps: true });
export default mongoose.model("Session", SessionSchema);
//# sourceMappingURL=Session.js.map