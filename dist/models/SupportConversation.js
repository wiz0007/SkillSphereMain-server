import mongoose, { Document, Schema } from "mongoose";
const SupportConversationSchema = new Schema({
    requester: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },
    assignedTo: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true,
    },
    topic: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
    },
    subject: {
        type: String,
        required: true,
        trim: true,
        maxlength: 180,
    },
    status: {
        type: String,
        enum: ["open", "waiting_on_support", "waiting_on_user", "resolved"],
        default: "open",
    },
    lastMessageAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
}, { timestamps: true });
SupportConversationSchema.index({ requester: 1, lastMessageAt: -1 });
export default mongoose.model("SupportConversation", SupportConversationSchema);
//# sourceMappingURL=SupportConversation.js.map