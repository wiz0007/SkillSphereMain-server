import mongoose, { Schema, Document } from "mongoose";

export interface IProfile extends Document {
  user: mongoose.Types.ObjectId;

  fullName: string;
  bio: string;

  country: string;
  state: string;
  city: string;
  timezone: string;

  phone: string;
  preferredLanguage: string;

  profilePhoto?: string;
  dob?: string;
  gender?: string;

  isTutor: boolean;

  tutorProfile?: {
    category: string;
    experience: number;
    hourlyRate: number;
  };
}

const ProfileSchema = new Schema<IProfile>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    fullName: { type: String, required: true },
    bio: { type: String, required: true },

    country: { type: String, required: true },
    state: { type: String, required: true },
    city: { type: String, required: true },
    timezone: { type: String, required: true },

    phone: { type: String, required: true },
    preferredLanguage: { type: String, required: true },

    profilePhoto: String,
    dob: String,
    gender: String,

    // ✅ NEW
    isTutor: {
      type: Boolean,
      default: false,
    },

    tutorProfile: {
      category: String,
      experience: Number,
      hourlyRate: Number,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IProfile>("Profile", ProfileSchema);

