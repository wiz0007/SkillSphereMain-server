type WalletPayloadInput = {
    userId: string;
    type: string;
    amount: number;
    balanceAfter: number;
    lockedAfter: number;
    description: string;
    createdAt: string;
    previousHash: string | null;
    sessionId?: string;
    courseId?: string;
    metadata?: Record<string, unknown>;
};
export declare const sha256: (value: string) => string;
export declare const buildCanonicalWalletPayload: ({ userId, type, amount, balanceAfter, lockedAfter, description, createdAt, previousHash, sessionId, courseId, metadata, }: WalletPayloadInput) => string;
export declare const hashWalletPayload: (payload: string) => string;
export declare const buildMerkleRoot: (hashes: string[]) => string | undefined;
export declare const buildMerkleProof: (hashes: string[], targetHash: string) => string[];
export {};
//# sourceMappingURL=auditHash.d.ts.map