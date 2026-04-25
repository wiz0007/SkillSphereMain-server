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

  settings?: {
    theme?: "dark" | "light";
    notifications?: {
      sessionUpdates?: boolean;
      courseRecommendations?: boolean;
      marketingEmails?: boolean;
    };
  };

  tutorProfile?: {
    headline?: string;
    bio?: string;

    skills?: string[];
    categories?: string[];

    experience?: number;
    experienceDetails?: string;

    education?: string;
    portfolioLinks?: string[];

    languages?: string[];

    availability?: boolean;

    teachingMode?: "Online" | "Offline" | "Both";

    rating?: number;
    totalSessions?: number;
    isVerified?: boolean;
  };
}

const TutorProfileSchema = new Schema(
  {
    headline: String,
    bio: String,
    skills: {
      type: [String],
      default: [],
    },
    categories: {
      type: [String],
      default: [],
    },
    experience: {
      type: Number,
      min: 0,
      default: 0,
    },
    experienceDetails: {
      type: String,
      default: "",
    },
    education: {
      type: String,
      default: "",
    },
    portfolioLinks: {
      type: [String],
      default: [],
    },
    languages: {
      type: [String],
      default: [],
    },
    availability: {
      type: Boolean,
      default: true,
    },
    teachingMode: {
      type: String,
      enum: ["Online", "Offline", "Both"],
      default: "Online",
    },
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
  { _id: false }
);

const SettingsSchema = new Schema(
  {
    theme: {
      type: String,
      enum: ["dark", "light"],
      default: "dark",
    },
    notifications: {
      sessionUpdates: {
        type: Boolean,
        default: true,
      },
      courseRecommendations: {
        type: Boolean,
        default: true,
      },
      marketingEmails: {
        type: Boolean,
        default: false,
      },
    },
  },
  { _id: false }
);

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
    settings: {
      type: SettingsSchema,
      default: () => ({
        theme: "dark",
        notifications: {
          sessionUpdates: true,
          courseRecommendations: true,
          marketingEmails: false,
        },
      }),
    },
    tutorProfile: {
      type: TutorProfileSchema,
      default: undefined,
    },
  },
  { timestamps: true }
);

ProfileSchema.index({ "tutorProfile.skills": 1 });
ProfileSchema.index({ "tutorProfile.categories": 1 });

ProfileSchema.index({
  "tutorProfile.skills": "text",
  "tutorProfile.categories": "text",
});

export default mongoose.model<IProfile>("Profile", ProfileSchema);
