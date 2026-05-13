import mongoose, { Document } from "mongoose";
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
    skillCoinBalance: number;
    lockedSkillCoins: number;
    isAdmin: boolean;
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
export default _default;
//# sourceMappingURL=User.d.ts.map