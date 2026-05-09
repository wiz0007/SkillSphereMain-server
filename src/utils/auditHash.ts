import crypto from "crypto";

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

const sortValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = sortValue(
          (value as Record<string, unknown>)[key]
        );
        return accumulator;
      }, {});
  }

  return value;
};

export const sha256 = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex");

export const buildCanonicalWalletPayload = ({
  userId,
  type,
  amount,
  balanceAfter,
  lockedAfter,
  description,
  createdAt,
  previousHash,
  sessionId,
  courseId,
  metadata,
}: WalletPayloadInput) =>
  JSON.stringify({
    version: 1,
    userId,
    type,
    amount,
    balanceAfter,
    lockedAfter,
    description,
    createdAt,
    previousHash,
    ...(sessionId ? { sessionId } : {}),
    ...(courseId ? { courseId } : {}),
    ...(metadata ? { metadata: sortValue(metadata) } : {}),
  });

export const hashWalletPayload = (payload: string) => sha256(payload);

const normalizeHash = (hash: string) =>
  hash.startsWith("0x") ? hash.toLowerCase() : `0x${hash.toLowerCase()}`;

export const buildMerkleRoot = (hashes: string[]) => {
  if (!hashes.length) {
    return "";
  }

  let level = hashes.map(normalizeHash);

  while (level.length > 1) {
    const nextLevel: string[] = [];

    for (let index = 0; index < level.length; index += 2) {
      const left = level[index];
      const right = level[index + 1] || left;
      nextLevel.push(normalizeHash(sha256(`${left}${right}`)));
    }

    level = nextLevel;
  }

  return level[0];
};

export const buildMerkleProof = (
  hashes: string[],
  targetHash: string
) => {
  if (!hashes.length) {
    return [];
  }

  let level = hashes.map(normalizeHash);
  let currentIndex = level.indexOf(normalizeHash(targetHash));

  if (currentIndex === -1) {
    return [];
  }

  const proof: string[] = [];

  while (level.length > 1) {
    const isRightNode = currentIndex % 2 === 1;
    const siblingIndex = isRightNode
      ? currentIndex - 1
      : currentIndex + 1;
    const siblingHash =
      level[siblingIndex] ?? level[currentIndex] ?? level[0]!;

    proof.push(siblingHash);

    const nextLevel: string[] = [];

    for (let index = 0; index < level.length; index += 2) {
      const left = level[index];
      const right = level[index + 1] || left;
      nextLevel.push(normalizeHash(sha256(`${left}${right}`)));
    }

    currentIndex = Math.floor(currentIndex / 2);
    level = nextLevel;
  }

  return proof;
};
