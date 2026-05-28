import type { UploadApiOptions, UploadApiResponse } from "cloudinary";
import cloudinary from "../config/cloudinary.js";

const hasCloudinaryConfig = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

export const uploadMulterFile = async (
  file: Express.Multer.File,
  options: UploadApiOptions = {}
): Promise<UploadApiResponse> => {
  if (!hasCloudinaryConfig()) {
    throw new Error("Cloudinary upload is not configured on the server");
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
