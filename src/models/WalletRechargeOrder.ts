import mongoose, { Document, Schema } from "mongoose";

export interface IWalletRechargeOrder extends Document {
  user: mongoose.Types.ObjectId;
  amountRupees: number;
  skillCoins: number;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  status: "created" | "paid" | "failed";
}

const WalletRechargeOrderSchema = new Schema<IWalletRechargeOrder>(
  {
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
  },
  { timestamps: true }
);

export default mongoose.model<IWalletRechargeOrder>(
  "WalletRechargeOrder",
  WalletRechargeOrderSchema
);
