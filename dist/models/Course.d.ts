import mongoose, { Document } from "mongoose";
export interface ICourse extends Document {
    tutor: mongoose.Types.ObjectId;
    title: string;
    description: string;
    type: "live" | "recorded";
    category: string;
    skills: string[];
    price: number;
    duration: string;
    contentDriveLink?: string;
    level: "Beginner" | "Intermediate" | "Advanced";
    isPublished: boolean;
    averageRating: number;
    totalRatings: number;
    reviewRefs: mongoose.Types.ObjectId[];
    savedBy: mongoose.Types.ObjectId[];
}
declare const _default: mongoose.Model<ICourse, {}, {}, {}, mongoose.Document<unknown, {}, ICourse, {}, mongoose.DefaultSchemaOptions> & ICourse & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ICourse>;
export default _default;
//# sourceMappingURL=Course.d.ts.map