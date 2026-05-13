import mongoose, { Document, Schema } from "mongoose";

export interface IAdminGift extends Document {
  recipient: mongoose.Types.ObjectId;
  senderAdmin: mongoose.Types.ObjectId;
  amount: number;
  note?: string;
  status: "pending" | "claimed";
  claimedAt?: Date | null;
}

const AdminGiftSchema = new Schema<IAdminGift>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    senderAdmin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "claimed"],
      default: "pending",
      index: true,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

AdminGiftSchema.index({ recipient: 1, status: 1, createdAt: -1 });

export default mongoose.model<IAdminGift>("AdminGift", AdminGiftSchema);
