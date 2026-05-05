import mongoose, { Document, Schema } from "mongoose";
const WalletTransactionSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: {
        type: String,
        enum: [
            "recharge",
            "session_lock",
            "session_unlock",
            "session_spend",
            "session_earn",
        ],
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    balanceAfter: {
        type: Number,
        required: true,
    },
    lockedAfter: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    session: {
        type: Schema.Types.ObjectId,
        ref: "Session",
    },
    course: {
        type: Schema.Types.ObjectId,
        ref: "Course",
    },
    metadata: {
        type: Schema.Types.Mixed,
    },
}, { timestamps: true });
export default mongoose.model("WalletTransaction", WalletTransactionSchema);
//# sourceMappingURL=WalletTransaction.js.map