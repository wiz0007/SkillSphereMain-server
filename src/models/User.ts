import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  profileCompleted: boolean;

  isVerified: boolean;

  otp?: string | undefined;
  otpExpires?: Date | undefined;

  /* 🔐 SECURITY FIELDS */
  otpAttempts: number;
  lockUntil?: Date | undefined;
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
    },

    password: {
      type: String,
      required: true,
    },

    profileCompleted: {
      type: Boolean,
      default: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    /* OTP */
    otp: {
      type: String,
    },

    otpExpires: {
      type: Date,
    },

    /* 🔐 SECURITY */
    otpAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: {
      type: Date,
    },
  },
  { timestamps: true }
);

/* ✅ INDEXES (important for performance + safety) */
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });

export default mongoose.model<IUser>("User", UserSchema);