import mongoose from "mongoose";
import AuditAnchor from "../models/AuditAnchor.js";
import WalletTransaction from "../models/WalletTransaction.js";
import { buildMerkleProof, buildMerkleRoot, } from "../utils/auditHash.js";
import { getPolygonAuditNetwork, isPolygonAuditConfigured, submitAnchorToPolygon, } from "./polygonClient.js";
const buildBatchId = () => `anchor_${new Date().toISOString().replace(/[:.]/g, "-")}`;
export const anchorPendingWalletTransactions = async () => {
    if (!isPolygonAuditConfigured()) {
        return null;
    }
    const pendingTransactions = await WalletTransaction.find({
        auditStatus: "pending",
    })
        .sort({ createdAt: 1, _id: 1 })
        .limit(100)
        .lean();
    if (!pendingTransactions.length) {
        return null;
    }
    const hashes = pendingTransactions.map((transaction) => transaction.hash);
    const rootHash = buildMerkleRoot(hashes) || hashes[0];
    const batchId = buildBatchId();
    const network = getPolygonAuditNetwork();
    const anchor = new AuditAnchor({
        batchId,
        chainName: "polygon",
        network,
        rootHash,
        transactionCount: pendingTransactions.length,
        transactionIds: pendingTransactions.map((transaction) => transaction._id),
        walletTransactionHashes: hashes,
        anchorStatus: "pending",
    });
    await anchor.save();
    try {
        anchor.anchorStatus = "submitted";
        await anchor.save();
        const polygonResult = await submitAnchorToPolygon({
            batchId,
            rootHash,
        });
        anchor.anchorStatus = "confirmed";
        anchor.chainTxHash = polygonResult.txHash;
        anchor.anchoredAt = new Date();
        if (typeof polygonResult.blockNumber === "number") {
            anchor.blockNumber = polygonResult.blockNumber;
        }
        await anchor.save();
        for (const transaction of pendingTransactions) {
            await WalletTransaction.updateOne({ _id: transaction._id }, {
                $set: {
                    auditStatus: "anchored",
                    anchorBatchId: anchor._id,
                    anchorRoot: rootHash,
                    anchoredAt: anchor.anchoredAt,
                    chainTxHash: anchor.chainTxHash,
                    chainName: "polygon",
                    network,
                    proofPath: buildMerkleProof(hashes, transaction.hash),
                },
            });
        }
        return anchor;
    }
    catch (error) {
        anchor.anchorStatus = "failed";
        anchor.failureReason =
            error?.message || "Polygon anchor submission failed";
        await anchor.save();
        await WalletTransaction.updateMany({
            _id: {
                $in: pendingTransactions.map((transaction) => transaction._id),
            },
        }, {
            $set: {
                auditStatus: "failed",
                anchorBatchId: anchor._id,
                anchorRoot: rootHash,
                chainName: "polygon",
                network,
                proofPath: [],
            },
        });
        return anchor;
    }
};
export const getWalletTransactionProof = async (transactionId, userId) => {
    if (!mongoose.Types.ObjectId.isValid(transactionId)) {
        return null;
    }
    const transaction = await WalletTransaction.findOne({
        _id: new mongoose.Types.ObjectId(transactionId),
        user: new mongoose.Types.ObjectId(userId),
    }).lean();
    if (!transaction) {
        return null;
    }
    const anchor = transaction.anchorBatchId
        ? await AuditAnchor.findById(transaction.anchorBatchId).lean()
        : null;
    return {
        transactionId: transaction._id.toString(),
        hash: transaction.hash,
        previousHash: transaction.previousHash || null,
        canonicalPayload: transaction.canonicalPayload,
        auditStatus: transaction.auditStatus,
        anchor: anchor
            ? {
                batchId: anchor.batchId,
                rootHash: anchor.rootHash,
                chainName: anchor.chainName,
                network: anchor.network,
                chainTxHash: anchor.chainTxHash || null,
                anchoredAt: anchor.anchoredAt || null,
                anchorStatus: anchor.anchorStatus,
            }
            : null,
        proof: {
            proofPath: transaction.proofPath || [],
            verificationType: "merkle",
        },
    };
};
//# sourceMappingURL=auditAnchor.service.js.map