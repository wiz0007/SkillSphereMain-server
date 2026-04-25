import mongoose, { Schema, Document } from "mongoose";
const SessionSchema = new Schema({
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
    status: {
        type: String,
        enum: ["pending", "accepted", "completed", "cancelled"],
        default: "pending",
    },
    price: { type: Number, required: true },
}, { timestamps: true });
export default mongoose.model("Session", SessionSchema);
//# sourceMappingURL=Session.js.map