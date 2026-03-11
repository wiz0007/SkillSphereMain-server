import { v2 as cloudinary } from "cloudinary";

export const configureCloudinary = () => {

  console.log("Cloud Name:", process.env.CLOUD_NAME);
  console.log("API Key:", process.env.CLOUDINARY_API_KEY);

  cloudinary.config({
    cloud_name: process.env.CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!
  });

};

export default cloudinary;