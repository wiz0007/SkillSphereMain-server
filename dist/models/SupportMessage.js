import mongoose, { Document, Schema } from "mongoose";
const SupportMessageSchema = new Schema({
    conversation: {
        type: Schema.Types.ObjectId,
        ref: "SupportConversation",
        required: true,
        index: true,
    },
    sender: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    senderRole: {
        type: String,
        enum: ["user", "support"],
        required: true,
    },
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 3000,
    },
    readAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });
SupportMessageSchema.index({ conversation: 1, createdAt: 1 });
export default mongoose.model("SupportMessage", SupportMessageSchema);
//# sourceMappingURL=SupportMessage.js.map