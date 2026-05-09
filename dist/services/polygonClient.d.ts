export declare const isPolygonAuditConfigured: () => boolean;
export declare const submitAnchorToPolygon: ({ batchId, rootHash, }: {
    batchId: string;
    rootHash: string;
}) => Promise<{
    txHash: string;
    blockNumber: number | undefined;
}>;
export declare const getPolygonAuditNetwork: () => "mainnet" | "amoy";
//# sourceMappingURL=polygonClient.d.ts.map