import mongoose, { Document } from "mongoose";
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
declare const _default: mongoose.Model<IProfile, {}, {}, {}, mongoose.Document<unknown, {}, IProfile, {}, mongoose.DefaultSchemaOptions> & IProfile & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IProfile>;
export default _default;
//# sourceMappingURL=Profile.d.ts.map