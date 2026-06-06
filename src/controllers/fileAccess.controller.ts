import type { RequestHandler } from "express";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import SupportConversation from "../models/SupportConversation.js";
import SupportMessage from "../models/SupportMessage.js";
import User from "../models/User.js";
import VerificationRequest from "../models/VerificationRequest.js";

const SIGNED_URL_TTL_SECONDS = 5 * 60;

type VerificationAssetKey =
  | "document-front"
  | "document-back"
  | "selfie"
  | "supporting-document";

const assetFieldMap: Record<
  VerificationAssetKey,
  {
    publicId: string;
    resourceType: string;
    deliveryType: string;
    legacyUrl: string;
  }
> = {
  "document-front": {
    publicId: "documentFrontPublicId",
    resourceType: "documentFrontResourceType",
    deliveryType: "documentFrontDeliveryType",
    legacyUrl: "documentFrontUrl",
  },
  "document-back": {
    publicId: "documentBackPublicId",
    resourceType: "documentBackResourceType",
    deliveryType: "documentBackDeliveryType",
    legacyUrl: "documentBackUrl",
  },
  selfie: {
    publicId: "selfiePublicId",
    resourceType: "selfieResourceType",
    deliveryType: "selfieDeliveryType",
    legacyUrl: "selfieUrl",
  },
  "supporting-document": {
    publicId: "supportingDocumentPublicId",
    resourceType: "supportingDocumentResourceType",
    deliveryType: "supportingDocumentDeliveryType",
    legacyUrl: "supportingDocumentUrl",
  },
};

const isValidObjectId = (id: string) => mongoose.Types.ObjectId.isValid(id);

const isAdminUser = async (userId: string) => {
  const user = await User.findById(userId).select("isAdmin").lean();
  return Boolean(user?.isAdmin);
};

const buildSignedCloudinaryUrl = ({
  publicId,
  resourceType,
  deliveryType,
}: {
  publicId: string;
  resourceType?: string | null;
  deliveryType?: string | null;
}) =>
  cloudinary.url(publicId, {
    secure: true,
    sign_url: true,
    type: deliveryType || "authenticated",
    resource_type: resourceType || "image",
    expires_at: Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS,
  });

export const openVerificationAsset: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;
    const requestId = String(req.params.requestId || "");
    const assetKey = String(req.params.asset || "") as VerificationAssetKey;
    const fields = assetFieldMap[assetKey];

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(requestId) || !fields) {
      return res.status(400).json({ message: "Invalid file request" });
    }

    const request = await VerificationRequest.findById(requestId).lean();

    if (!request) {
      return res.status(404).json({ message: "File not found" });
    }

    const allowed =
      request.user.toString() === userId || (await isAdminUser(userId));

    if (!allowed) {
      return res.status(403).json({ message: "File access denied" });
    }

    const publicId = String((request as any)[fields.publicId] || "");

    if (publicId) {
      return res.redirect(
        buildSignedCloudinaryUrl({
          publicId,
          resourceType: String((request as any)[fields.resourceType] || ""),
          deliveryType: String((request as any)[fields.deliveryType] || ""),
        })
      );
    }

    const legacyUrl = String((request as any)[fields.legacyUrl] || "");

    if (legacyUrl) {
      return res.redirect(legacyUrl);
    }

    return res.status(404).json({ message: "File not found" });
  } catch (error) {
    console.error("OPEN VERIFICATION ASSET ERROR:", error);
    return res.status(500).json({ message: "Failed to open file" });
  }
};

export const openSupportAttachment: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;
    const messageId = String(req.params.messageId || "");

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!isValidObjectId(messageId)) {
      return res.status(400).json({ message: "Invalid file request" });
    }

    const message = await SupportMessage.findById(messageId).lean();

    if (!message) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    const conversation = await SupportConversation.findById(
      message.conversation
    )
      .select("requester assignedTo")
      .lean();

    if (!conversation) {
      return res.status(404).json({ message: "Support conversation not found" });
    }

    const allowed =
      conversation.requester.toString() === userId ||
      conversation.assignedTo?.toString() === userId ||
      (await isAdminUser(userId));

    if (!allowed) {
      return res.status(403).json({ message: "File access denied" });
    }

    if (message.attachmentPublicId) {
      return res.redirect(
        buildSignedCloudinaryUrl({
          publicId: message.attachmentPublicId,
          resourceType: message.attachmentResourceType,
          deliveryType: message.attachmentDeliveryType,
        })
      );
    }

    if (message.attachmentUrl) {
      return res.redirect(message.attachmentUrl);
    }

    return res.status(404).json({ message: "Attachment not found" });
  } catch (error) {
    console.error("OPEN SUPPORT ATTACHMENT ERROR:", error);
    return res.status(500).json({ message: "Failed to open attachment" });
  }
};
