import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  profileCompleted: boolean;

  isVerified: boolean;
  otp?: string | undefined;
  otpExpires?: Date | undefined;
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

    otp: String,
    otpExpires: Date,
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);