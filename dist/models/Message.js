import mongoose, { Document, Schema } from "mongoose";
const MessageSchema = new Schema({
    sender: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    recipient: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
    },
    readAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });
MessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
export default mongoose.model("Message", MessageSchema);
//# sourceMappingURL=Message.js.map