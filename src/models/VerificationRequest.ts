import mongoose, { Document, Schema } from "mongoose";

export type VerificationRequestType = "identity" | "tutor";
export type VerificationRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "resubmission_required";

export interface IVerificationRequest extends Document {
  user: mongoose.Types.ObjectId;
  type: VerificationRequestType;
  provider: "manual";
  status: VerificationRequestStatus;
  documentType?: string;
  documentFrontUrl?: string | null;
  documentBackUrl?: string | null;
  selfieUrl?: string | null;
  supportingDocumentUrl?: string | null;
  supportingDocumentName?: string | null;
  supportingDocumentMimeType?: string | null;
  note?: string;
  reviewNote?: string;
  reviewedBy?: mongoose.Types.ObjectId | null;
  reviewedAt?: Date | null;
}

const VerificationRequestSchema = new Schema<IVerificationRequest>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["identity", "tutor"],
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["manual"],
      default: "manual",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "resubmission_required"],
      default: "pending",
      index: true,
    },
    documentType: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80,
    },
    documentFrontUrl: {
      type: String,
      default: null,
      trim: true,
    },
    documentBackUrl: {
      type: String,
      default: null,
      trim: true,
    },
    selfieUrl: {
      type: String,
      default: null,
      trim: true,
    },
    supportingDocumentUrl: {
      type: String,
      default: null,
      trim: true,
    },
    supportingDocumentName: {
      type: String,
      default: null,
      trim: true,
      maxlength: 180,
    },
    supportingDocumentMimeType: {
      type: String,
      default: null,
      trim: true,
      maxlength: 120,
    },
    note: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    reviewNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

VerificationRequestSchema.index({ user: 1, type: 1, createdAt: -1 });

export default mongoose.model<IVerificationRequest>(
  "VerificationRequest",
  VerificationRequestSchema
);
