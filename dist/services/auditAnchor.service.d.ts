import mongoose from "mongoose";
export declare const anchorPendingWalletTransactions: () => Promise<(mongoose.Document<unknown, {}, import("../models/AuditAnchor.js").IAuditAnchor, {}, mongoose.DefaultSchemaOptions> & import("../models/AuditAnchor.js").IAuditAnchor & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}) | null>;
export declare const getWalletTransactionProof: (transactionId: string, userId: string) => Promise<{
    transactionId: string;
    hash: string;
    previousHash: string | null;
    canonicalPayload: string;
    auditStatus: "pending" | "failed" | "anchored";
    anchor: {
        batchId: string;
        rootHash: string;
        chainName: "polygon";
        network: "mainnet" | "amoy";
        chainTxHash: string | null;
        anchoredAt: Date | null;
        anchorStatus: "pending" | "submitted" | "confirmed" | "failed";
    } | null;
    proof: {
        proofPath: string[];
        verificationType: string;
    };
} | null>;
//# sourceMappingURL=auditAnchor.service.d.ts.map