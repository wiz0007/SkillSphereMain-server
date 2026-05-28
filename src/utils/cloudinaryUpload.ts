import type { UploadApiOptions, UploadApiResponse } from "cloudinary";
import cloudinary from "../config/cloudinary.js";

const getCloudinaryConfigStatus = () => {
  const entries = {
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  };

  return Object.fromEntries(
    Object.entries(entries).map(([key, value]) => [
      key,
      Boolean(value?.trim()),
    ])
  ) as Record<keyof typeof entries, boolean>;
};

export const uploadMulterFile = async (
  file: Express.Multer.File,
  options: UploadApiOptions = {}
): Promise<UploadApiResponse> => {
  const configStatus = getCloudinaryConfigStatus();
  const missingKeys = Object.entries(configStatus)
    .filter(([, present]) => !present)
    .map(([key]) => key);

  if (missingKeys.length) {
    console.error("CLOUDINARY CONFIG MISSING:", configStatus);
    throw new Error(
      `Cloudinary upload is not configured on the server. Missing: ${missingKeys.join(
        ", "
      )}`
    );
  }

  if (file.buffer?.length) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error || !result) {
            reject(error || new Error("Cloudinary upload failed"));
            return;
          }

          resolve(result);
        }
      );

      stream.end(file.buffer);
    });
  }

  if (file.path) {
    return cloudinary.uploader.upload(file.path, options);
  }

  throw new Error("Uploaded file has no readable data");
};
