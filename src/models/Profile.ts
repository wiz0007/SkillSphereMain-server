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
    headline: string;
    skills: string[];
    categories: string[];
    experience: number;
    hourlyRate: number;
    languages: string[];

    availability?: {
      day: string;
      slots: string[];
    }[];

    rating?: number;
    totalSessions?: number;
    isVerified?: boolean;
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

    isTutor: {
      type: Boolean,
      default: false,
    },

    tutorProfile: {
      headline: String,

      skills: [String], // 🔥 searchable

      categories: [String], // 🔥 filterable

      experience: {
        type: Number,
        min: 0,
      },

      hourlyRate: {
        type: Number,
        min: 0,
      },

      languages: [String],

      availability: [
        {
          day: String,
          slots: [String],
        },
      ],

      rating: {
        type: Number,
        default: 0,
      },

      totalSessions: {
        type: Number,
        default: 0,
      },

      isVerified: {
        type: Boolean,
        default: false,
      },
    },
  },
  { timestamps: true }
);

/* ================= INDEXING ================= */

// 🔥 Fast filtering
ProfileSchema.index({ "tutorProfile.skills": 1 });
ProfileSchema.index({ "tutorProfile.categories": 1 });
ProfileSchema.index({ "tutorProfile.hourlyRate": 1 });

// 🔥 Optional text search (advanced)
ProfileSchema.index({
  "tutorProfile.skills": "text",
  "tutorProfile.categories": "text",
});

export default mongoose.model<IProfile>("Profile", ProfileSchema);

