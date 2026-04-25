import mongoose, { Schema, Document } from "mongoose";
const ActivitySchema = new Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: {
        type: String,
        enum: ["SESSION", "COURSE", "SYSTEM"],
        required: true,
    },
    action: {
        type: String,
        required: true,
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
    },
    metadata: {
        type: Schema.Types.Mixed,
    },
    message: { type: String, required: true },
    isRead: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });
export default mongoose.model("Activity", ActivitySchema);
//# sourceMappingURL=Activity.js.map