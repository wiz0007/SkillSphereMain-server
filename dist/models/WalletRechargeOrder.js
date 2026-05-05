import mongoose, { Document, Schema } from "mongoose";
const WalletRechargeOrderSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    amountRupees: {
        type: Number,
        required: true,
        min: 1,
    },
    skillCoins: {
        type: Number,
        required: true,
        min: 1,
    },
    razorpayOrderId: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    razorpayPaymentId: {
        type: String,
        trim: true,
    },
    razorpaySignature: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ["created", "paid", "failed"],
        default: "created",
    },
}, { timestamps: true });
export default mongoose.model("WalletRechargeOrder", WalletRechargeOrderSchema);
//# sourceMappingURL=WalletRechargeOrder.js.map