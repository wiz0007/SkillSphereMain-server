import multer from "multer";
import type { RequestHandler } from "express";

const storage = multer.memoryStorage();

const imageFileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
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

export const handleUpload =
  (middleware: RequestHandler): RequestHandler =>
  (req, res, next) => {
    middleware(req, res, (error: unknown) => {
      if (!error) {
        next();
        return;
      }

      if (error instanceof multer.MulterError) {
        const message =
          error.code === "LIMIT_FILE_SIZE"
            ? "File is too large"
            : error.message || "Upload failed";

        res.status(400).json({ message });
        return;
      }

      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
        return;
      }

      res.status(400).json({ message: "Upload failed" });
    });
  };

const SUPPORT_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const supportFileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (!SUPPORT_ATTACHMENT_TYPES.has(file.mimetype)) {
    return cb(
      new Error("Only JPG, PNG, WEBP, PDF, DOC, DOCX, and TXT files are allowed")
    );
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

const VERIFICATION_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const verificationFileFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (!VERIFICATION_ATTACHMENT_TYPES.has(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, WEBP, and PDF files are allowed"));
  }

  cb(null, true);
};

export const verificationUpload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  fileFilter: verificationFileFilter,
});
