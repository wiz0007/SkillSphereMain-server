import mongoose, { Document } from "mongoose";
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
declare const _default: mongoose.Model<IAuditAnchor, {}, {}, {}, mongoose.Document<unknown, {}, IAuditAnchor, {}, mongoose.DefaultSchemaOptions> & IAuditAnchor & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IAuditAnchor>;
export default _default;
//# sourceMappingURL=AuditAnchor.d.ts.map