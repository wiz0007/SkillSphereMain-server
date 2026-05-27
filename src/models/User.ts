import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  hasPassword: boolean;
  authProvider: "local" | "google" | "linkedin" | "github";
  googleId?: string | null;
  linkedinId?: string | null;
  githubId?: string | null;
  profileCompleted: boolean;
  isVerified: boolean;
  identityVerificationStatus:
    | "not_started"
    | "pending"
    | "approved"
    | "rejected"
    | "resubmission_required";
  tutorVerificationStatus:
    | "not_started"
    | "pending"
    | "approved"
    | "rejected"
    | "resubmission_required";
  verifiedBadgeLevel: "none" | "basic" | "identity" | "tutor";

  otp?: string | null;
  otpExpires?: Date | null;
  passwordResetToken?: string | null;
  passwordResetExpires?: Date | null;
  lastVerificationReminderAt?: Date | null;

  otpAttempts: number;
  lockUntil?: Date | null;
  skillCoinBalance: number;
  lockedSkillCoins: number;
  isAdmin: boolean;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    hasPassword: {
      type: Boolean,
      default: true,
    },

    authProvider: {
      type: String,
      enum: ["local", "google", "linkedin", "github"],
      default: "local",
    },

    googleId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },

    linkedinId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },

    githubId: {
      type: String,
      default: null,
      index: true,
      sparse: true,
    },

    profileCompleted: {
      type: Boolean,
      default: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    identityVerificationStatus: {
      type: String,
      enum: [
        "not_started",
        "pending",
        "approved",
        "rejected",
        "resubmission_required",
      ],
      default: "not_started",
    },

    tutorVerificationStatus: {
      type: String,
      enum: [
        "not_started",
        "pending",
        "approved",
        "rejected",
        "resubmission_required",
      ],
      default: "not_started",
    },

    verifiedBadgeLevel: {
      type: String,
      enum: ["none", "basic", "identity", "tutor"],
      default: "none",
    },

    /* OTP */
    otp: String,
    otpExpires: Date,
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpires: {
      type: Date,
      default: null,
    },
    lastVerificationReminderAt: {
      type: Date,
      default: null,
    },

    /* 🔐 SECURITY */
    otpAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: Date,

    isAdmin: {
      type: Boolean,
      default: false,
    },

    skillCoinBalance: {
      type: Number,
      default: 0,
      min: 0,
    },

    lockedSkillCoins: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
