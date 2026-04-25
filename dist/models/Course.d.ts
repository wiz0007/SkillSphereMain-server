import mongoose, { Document } from "mongoose";
export interface IRating {
    user: mongoose.Types.ObjectId;
    value: number;
}
export interface IReview {
    user: mongoose.Types.ObjectId;
    rating: number;
    comment: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface ICourse extends Document {
    tutor: mongoose.Types.ObjectId;
    title: string;
    description: string;
    category: string;
    skills: string[];
    price: number;
    duration: string;
    level: "Beginner" | "Intermediate" | "Advanced";
    isPublished: boolean;
    ratings: IRating[];
    averageRating: number;
    totalRatings: number;
    reviews: IReview[];
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