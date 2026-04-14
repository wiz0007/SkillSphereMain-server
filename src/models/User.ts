import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  profileCompleted: boolean;

  isVerified: boolean;

  otp?: string | null;
  otpExpires?: Date | null;

  otpAttempts: number;
  lockUntil?: Date | null;
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

    profileCompleted: {
      type: Boolean,
      default: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    /* OTP */
    otp: String,
    otpExpires: Date,

    /* 🔐 SECURITY */
    otpAttempts: {
      type: Number,
      default: 0,
    },

    lockUntil: Date,
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);