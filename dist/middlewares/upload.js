import multer from "multer";
const storage = multer.diskStorage({});
const imageFileFilter = (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("Only images allowed"));
    }
    cb(null, true);
};
export const upload = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024, // 2MB
    },
    fileFilter: imageFileFilter,
});
const SUPPORT_ATTACHMENT_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
]);
const supportFileFilter = (req, file, cb) => {
    if (!SUPPORT_ATTACHMENT_TYPES.has(file.mimetype)) {
        return cb(new Error("Only JPG, PNG, WEBP, PDF, DOC, DOCX, and TXT files are allowed"));
    }
    cb(null, true);
};
export const supportUpload = multer({
    storage,
    limits: {
        fileSize: 8 * 1024 * 1024,
    },
    fileFilter: supportFileFilter,
});
//# sourceMappingURL=upload.js.map