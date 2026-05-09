import { ethers } from "ethers";

const getPolygonEnv = () => ({
  rpcUrl: process.env.POLYGON_RPC_URL || "",
  privateKey: process.env.POLYGON_AUDIT_PRIVATE_KEY || "",
  contractAddress:
    process.env.POLYGON_AUDIT_CONTRACT_ADDRESS || "",
  network:
    (process.env.POLYGON_NETWORK as "mainnet" | "amoy" | undefined) ||
    "amoy",
});

const auditAnchorAbi = [
  "function submitAnchor(string batchId, bytes32 rootHash) external",
];

export const isPolygonAuditConfigured = () => {
  const env = getPolygonEnv();
  return Boolean(
    env.rpcUrl && env.privateKey && env.contractAddress
  );
};

export const submitAnchorToPolygon = async ({
  batchId,
  rootHash,
}: {
  batchId: string;
  rootHash: string;
}) => {
  if (!isPolygonAuditConfigured()) {
    throw new Error("Polygon audit environment is not configured");
  }

  const { rpcUrl, privateKey, contractAddress } = getPolygonEnv();
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(
    contractAddress,
    auditAnchorAbi,
    signer
  ) as ethers.Contract & {
    submitAnchor: (
      batchId: string,
      rootHash: string
    ) => Promise<ethers.ContractTransactionResponse>;
  };

  const transaction = await contract.submitAnchor(batchId, rootHash);
  const receipt = await transaction.wait();

  return {
    txHash: transaction.hash,
    blockNumber: receipt?.blockNumber || undefined,
  };
};

export const getPolygonAuditNetwork = () => getPolygonEnv().network;
