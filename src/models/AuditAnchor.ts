import mongoose, { Document, Schema } from "mongoose";

export interface IAuditAnchor extends Document {
  batchId: string;
  chainName: "polygon";
  network: "mainnet" | "amoy";
  rootHash: string;
  transactionCount: number;
  transactionIds: mongoose.Types.ObjectId[];
  walletTransactionHashes: string[];
  anchorStatus: "pending" | "submitted" | "confirmed" | "failed";
  chainTxHash?: string;
  blockNumber?: number;
  anchoredAt?: Date;
  failureReason?: string;
}

const AuditAnchorSchema = new Schema<IAuditAnchor>(
  {
    batchId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    chainName: {
      type: String,
      enum: ["polygon"],
      required: true,
      default: "polygon",
    },
    network: {
      type: String,
      enum: ["mainnet", "amoy"],
      required: true,
      default: "amoy",
    },
    rootHash: {
      type: String,
      required: true,
      trim: true,
    },
    transactionCount: {
      type: Number,
      required: true,
      min: 1,
    },
    transactionIds: {
      type: [Schema.Types.ObjectId],
      ref: "WalletTransaction",
      default: [],
    },
    walletTransactionHashes: {
      type: [String],
      default: [],
    },
    anchorStatus: {
      type: String,
      enum: ["pending", "submitted", "confirmed", "failed"],
      default: "pending",
    },
    chainTxHash: {
      type: String,
      trim: true,
    },
    blockNumber: Number,
    anchoredAt: Date,
    failureReason: String,
  },
  { timestamps: true }
);

export default mongoose.model<IAuditAnchor>(
  "AuditAnchor",
  AuditAnchorSchema
);
