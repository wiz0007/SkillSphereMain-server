import mongoose, { Document, Schema } from "mongoose";
const WithdrawalRequestSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 1,
    },
    upiId: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },
    note: {
        type: String,
        trim: true,
        default: "",
    },
    status: {
        type: String,
        enum: ["pending", "processing", "paid", "rejected"],
        default: "pending",
    },
    reviewedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
    },
    reviewedAt: {
        type: Date,
        default: null,
    },
    adminNote: {
        type: String,
        trim: true,
        default: null,
    },
    paidAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });
export default mongoose.model("WithdrawalRequest", WithdrawalRequestSchema);
//# sourceMappingURL=WithdrawalRequest.js.map