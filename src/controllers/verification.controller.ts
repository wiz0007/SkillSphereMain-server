import type { RequestHandler } from "express";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import Profile from "../models/Profile.js";
import User from "../models/User.js";
import VerificationRequest, {
  type VerificationRequestStatus,
  type VerificationRequestType,
} from "../models/VerificationRequest.js";

const VALID_IDENTITY_TYPES = [
  "aadhaar",
  "pan",
  "passport",
  "driving_license",
  "other",
];

const getId = (param: unknown): string => {
  if (typeof param === "string") return param;
  if (Array.isArray(param) && typeof param[0] === "string") return param[0];
  return "";
};

const getProfileMap = async (userIds: string[]) => {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];

  if (!uniqueIds.length) {
    return new Map<string, any>();
  }

  const profiles = await Profile.find({
    user: {
      $in: uniqueIds.map((id) => new mongoose.Types.ObjectId(id)),
    },
  })
    .select("user fullName profilePhoto isTutor")
    .lean();

  return new Map(
    profiles.map((profile) => [
      profile.user.toString(),
      {
        fullName: profile.fullName || "",
        profilePhoto: profile.profilePhoto || "",
        isTutor: !!profile.isTutor,
      },
    ])
  );
};

const serializeUser = (user: any, profileMap: Map<string, any>) => {
  const id = user?._id?.toString?.() || user?.toString?.() || "";
  const profile = profileMap.get(id);

  return {
    _id: id,
    username: user?.username || "",
    email: user?.email || "",
    fullName: profile?.fullName || "",
    profilePhoto: profile?.profilePhoto || "",
    isTutor: profile?.isTutor || false,
    isAdmin: Boolean(user?.isAdmin),
  };
};

const uploadVerificationAsset = async (file?: Express.Multer.File) => {
  if (!file) {
    return null;
  }

  const result = await cloudinary.uploader.upload(file.path, {
    resource_type: "auto",
    folder: "skillsphere/verifications",
  });

  return {
    url: result.secure_url,
    name: file.originalname,
    mimeType: file.mimetype,
  };
};

const deriveVerifiedBadgeLevel = (user: {
  isVerified: boolean;
  identityVerificationStatus?: string;
  tutorVerificationStatus?: string;
}) => {
  if (user.tutorVerificationStatus === "approved") {
    return "tutor";
  }

  if (user.identityVerificationStatus === "approved") {
    return "identity";
  }

  if (user.isVerified) {
    return "basic";
  }

  return "none";
};

const syncVerificationSummary = async (userId: mongoose.Types.ObjectId | string) => {
  const user = await User.findById(userId);

  if (!user) {
    return null;
  }

  user.verifiedBadgeLevel = deriveVerifiedBadgeLevel(user as any);

  await user.save();

  return user;
};

const serializeVerification = (
  request: any,
  profileMap: Map<string, any>
) => ({
  _id: request._id.toString(),
  type: request.type,
  provider: request.provider,
  status: request.status,
  documentType: request.documentType || "",
  note: request.note || "",
  reviewNote: request.reviewNote || "",
  createdAt: request.createdAt,
  updatedAt: request.updatedAt,
  reviewedAt: request.reviewedAt || null,
  user: request.user ? serializeUser(request.user, profileMap) : null,
  reviewedBy: request.reviewedBy
    ? serializeUser(request.reviewedBy, profileMap)
    : null,
  assets: {
    documentFrontUrl: request.documentFrontUrl || null,
    documentBackUrl: request.documentBackUrl || null,
    selfieUrl: request.selfieUrl || null,
    supportingDocumentUrl: request.supportingDocumentUrl || null,
    supportingDocumentName: request.supportingDocumentName || null,
    supportingDocumentMimeType: request.supportingDocumentMimeType || null,
  },
});

export const getVerificationSummary: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId).select(
      "isVerified identityVerificationStatus tutorVerificationStatus verifiedBadgeLevel"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const requests = await VerificationRequest.find({
      user: new mongoose.Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .lean();

    const profileMap = await getProfileMap([userId]);

    return res.json({
      summary: {
        emailVerified: Boolean(user.isVerified),
        identityVerificationStatus: user.identityVerificationStatus,
        tutorVerificationStatus: user.tutorVerificationStatus,
        verifiedBadgeLevel: user.verifiedBadgeLevel,
      },
      requests: requests.map((request) =>
        serializeVerification(
          {
            ...request,
            user: {
              _id: userId,
            },
          },
          profileMap
        )
      ),
    });
  } catch (error: any) {
    console.error("GET VERIFICATION SUMMARY ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch verification summary" });
  }
};

export const submitIdentityVerification: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;
    const documentType = String(req.body.documentType || "").trim().toLowerCase();
    const note = String(req.body.note || "").trim();
    const files = req.files as
      | {
          [fieldname: string]: Express.Multer.File[];
        }
      | undefined;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!VALID_IDENTITY_TYPES.includes(documentType)) {
      return res.status(400).json({ message: "Select a valid ID type" });
    }

    const documentFront = files?.documentFront?.[0];
    const documentBack = files?.documentBack?.[0];
    const selfie = files?.selfie?.[0];

    if (!documentFront || !selfie) {
      return res.status(400).json({
        message: "Document front and selfie are required",
      });
    }

    const [frontAsset, backAsset, selfieAsset] = await Promise.all([
      uploadVerificationAsset(documentFront),
      uploadVerificationAsset(documentBack),
      uploadVerificationAsset(selfie),
    ]);

    await VerificationRequest.updateMany(
      {
        user: new mongoose.Types.ObjectId(userId),
        type: "identity",
        status: { $in: ["pending", "resubmission_required"] },
      },
      {
        $set: {
          status: "rejected",
          reviewNote: "Superseded by a newer identity verification submission",
          reviewedAt: new Date(),
        },
      }
    );

    const request = await VerificationRequest.create({
      user: new mongoose.Types.ObjectId(userId),
      type: "identity",
      provider: "manual",
      status: "pending",
      documentType,
      documentFrontUrl: frontAsset?.url || null,
      documentBackUrl: backAsset?.url || null,
      selfieUrl: selfieAsset?.url || null,
      note,
    });

    await User.findByIdAndUpdate(userId, {
      identityVerificationStatus: "pending",
    });

    const user = await syncVerificationSummary(userId);
    const profileMap = await getProfileMap([userId]);

    return res.status(201).json({
      message: "Identity verification submitted",
      summary: {
        emailVerified: Boolean(user?.isVerified),
        identityVerificationStatus: user?.identityVerificationStatus || "pending",
        tutorVerificationStatus: user?.tutorVerificationStatus || "not_started",
        verifiedBadgeLevel: user?.verifiedBadgeLevel || "none",
      },
      request: serializeVerification(
        {
          ...request.toObject(),
          user: {
            _id: userId,
          },
        },
        profileMap
      ),
    });
  } catch (error: any) {
    console.error("SUBMIT IDENTITY VERIFICATION ERROR:", error);
    return res.status(500).json({ message: "Failed to submit identity verification" });
  }
};

export const submitTutorVerification: RequestHandler = async (req, res) => {
  try {
    const userId = req.userId;
    const note = String(req.body.note || "").trim();
    const files = req.files as
      | {
          [fieldname: string]: Express.Multer.File[];
        }
      | undefined;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const [user, profile] = await Promise.all([
      User.findById(userId),
      Profile.findOne({ user: new mongoose.Types.ObjectId(userId) }),
    ]);

    if (!user || !profile) {
      return res.status(404).json({ message: "User profile not found" });
    }

    if (!profile.isTutor) {
      return res.status(400).json({ message: "Only tutors can request tutor verification" });
    }

    if (user.identityVerificationStatus !== "approved") {
      return res.status(400).json({
        message: "Identity verification must be approved before tutor verification",
      });
    }

    const supportingDocument = files?.supportingDocument?.[0];

    if (!supportingDocument) {
      return res.status(400).json({
        message: "A supporting document is required",
      });
    }

    const supportingAsset = await uploadVerificationAsset(supportingDocument);

    await VerificationRequest.updateMany(
      {
        user: new mongoose.Types.ObjectId(userId),
        type: "tutor",
        status: { $in: ["pending", "resubmission_required"] },
      },
      {
        $set: {
          status: "rejected",
          reviewNote: "Superseded by a newer tutor verification submission",
          reviewedAt: new Date(),
        },
      }
    );

    const request = await VerificationRequest.create({
      user: new mongoose.Types.ObjectId(userId),
      type: "tutor",
      provider: "manual",
      status: "pending",
      supportingDocumentUrl: supportingAsset?.url || null,
      supportingDocumentName: supportingAsset?.name || null,
      supportingDocumentMimeType: supportingAsset?.mimeType || null,
      note,
    });

    user.tutorVerificationStatus = "pending";
    await user.save();
    const synced = await syncVerificationSummary(userId);
    const profileMap = await getProfileMap([userId]);

    return res.status(201).json({
      message: "Tutor verification submitted",
      summary: {
        emailVerified: Boolean(synced?.isVerified),
        identityVerificationStatus:
          synced?.identityVerificationStatus || "approved",
        tutorVerificationStatus: synced?.tutorVerificationStatus || "pending",
        verifiedBadgeLevel: synced?.verifiedBadgeLevel || "identity",
      },
      request: serializeVerification(
        {
          ...request.toObject(),
          user: {
            _id: userId,
          },
        },
        profileMap
      ),
    });
  } catch (error: any) {
    console.error("SUBMIT TUTOR VERIFICATION ERROR:", error);
    return res.status(500).json({ message: "Failed to submit tutor verification" });
  }
};

export const getAdminVerificationRequests: RequestHandler = async (req, res) => {
  try {
    const status = String(req.query.status || "").trim();
    const type = String(req.query.type || "").trim();

    const query: Record<string, any> = {};

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    const requests = await VerificationRequest.find(query)
      .populate("user", "username email isAdmin")
      .populate("reviewedBy", "username email isAdmin")
      .sort({ createdAt: -1 })
      .limit(150)
      .lean();

    const profileMap = await getProfileMap(
      requests.flatMap((request) => [
        request.user?._id?.toString?.() || "",
        request.reviewedBy?._id?.toString?.() || "",
      ])
    );

    return res.json(requests.map((request) => serializeVerification(request, profileMap)));
  } catch (error: any) {
    console.error("ADMIN GET VERIFICATIONS ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch verification requests" });
  }
};

export const reviewVerificationRequest: RequestHandler = async (req, res) => {
  try {
    const requestId = getId(req.params.id);
    const reviewerId = req.userId;
    const status = String(req.body.status || "").trim() as VerificationRequestStatus;
    const reviewNote = String(req.body.reviewNote || "").trim();

    if (!reviewerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: "Invalid verification request ID" });
    }

    if (!["approved", "rejected", "resubmission_required"].includes(status)) {
      return res.status(400).json({ message: "Invalid verification review status" });
    }

    const request = await VerificationRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Verification request not found" });
    }

    const [user, profile] = await Promise.all([
      User.findById(request.user),
      Profile.findOne({ user: request.user }),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    request.status = status;
    request.reviewNote = reviewNote;
    request.reviewedBy = new mongoose.Types.ObjectId(reviewerId);
    request.reviewedAt = new Date();
    await request.save();

    const field =
      request.type === "identity"
        ? "identityVerificationStatus"
        : "tutorVerificationStatus";

    (user as any)[field] = status;

    if (request.type === "tutor" && profile?.tutorProfile) {
      profile.tutorProfile.isVerified = status === "approved";
      await profile.save();
    }

    await user.save();
    const synced = await syncVerificationSummary(user._id);
    const populated = await VerificationRequest.findById(request._id)
      .populate("user", "username email isAdmin")
      .populate("reviewedBy", "username email isAdmin")
      .lean();
    const profileMap = await getProfileMap([
      request.user.toString(),
      reviewerId,
    ]);

    return res.json({
      message: "Verification request updated",
      request: serializeVerification(populated, profileMap),
      summary: {
        emailVerified: Boolean(synced?.isVerified),
        identityVerificationStatus:
          synced?.identityVerificationStatus || "not_started",
        tutorVerificationStatus:
          synced?.tutorVerificationStatus || "not_started",
        verifiedBadgeLevel: synced?.verifiedBadgeLevel || "none",
      },
    });
  } catch (error: any) {
    console.error("ADMIN REVIEW VERIFICATION ERROR:", error);
    return res.status(500).json({ message: "Failed to review verification request" });
  }
};
