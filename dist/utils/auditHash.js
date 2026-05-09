import crypto from "crypto";
const sortValue = (value) => {
    if (Array.isArray(value)) {
        return value.map(sortValue);
    }
    if (value && typeof value === "object") {
        return Object.keys(value)
            .sort()
            .reduce((accumulator, key) => {
            accumulator[key] = sortValue(value[key]);
            return accumulator;
        }, {});
    }
    return value;
};
export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
export const buildCanonicalWalletPayload = ({ userId, type, amount, balanceAfter, lockedAfter, description, createdAt, previousHash, sessionId, courseId, metadata, }) => JSON.stringify({
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
export const hashWalletPayload = (payload) => sha256(payload);
const normalizeHash = (hash) => hash.startsWith("0x") ? hash.toLowerCase() : `0x${hash.toLowerCase()}`;
export const buildMerkleRoot = (hashes) => {
    if (!hashes.length) {
        return "";
    }
    let level = hashes.map(normalizeHash);
    while (level.length > 1) {
        const nextLevel = [];
        for (let index = 0; index < level.length; index += 2) {
            const left = level[index];
            const right = level[index + 1] || left;
            nextLevel.push(normalizeHash(sha256(`${left}${right}`)));
        }
        level = nextLevel;
    }
    return level[0];
};
export const buildMerkleProof = (hashes, targetHash) => {
    if (!hashes.length) {
        return [];
    }
    let level = hashes.map(normalizeHash);
    let currentIndex = level.indexOf(normalizeHash(targetHash));
    if (currentIndex === -1) {
        return [];
    }
    const proof = [];
    while (level.length > 1) {
        const isRightNode = currentIndex % 2 === 1;
        const siblingIndex = isRightNode
            ? currentIndex - 1
            : currentIndex + 1;
        const siblingHash = level[siblingIndex] ?? level[currentIndex] ?? level[0];
        proof.push(siblingHash);
        const nextLevel = [];
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
//# sourceMappingURL=auditHash.js.map