import mongoose, { Document, Schema } from "mongoose";
const AuditAnchorSchema = new Schema({
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
}, { timestamps: true });
export default mongoose.model("AuditAnchor", AuditAnchorSchema);
//# sourceMappingURL=AuditAnchor.js.map