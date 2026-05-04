import mongoose, { Document, Schema } from "mongoose";

export interface IWalletTransaction extends Document {
  user: mongoose.Types.ObjectId;
  type:
    | "recharge"
    | "session_lock"
    | "session_unlock"
    | "session_spend"
    | "session_earn";
  amount: number;
  balanceAfter: number;
  lockedAfter: number;
  description: string;
  session?: mongoose.Types.ObjectId;
  course?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
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
  },
  { timestamps: true }
);

export default mongoose.model<IWalletTransaction>(
  "WalletTransaction",
  WalletTransactionSchema
);
