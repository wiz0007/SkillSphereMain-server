import mongoose, { Document } from "mongoose";
export type VerificationRequestType = "identity" | "tutor";
export type VerificationRequestStatus = "pending" | "approved" | "rejected" | "resubmission_required";
export interface IVerificationRequest extends Document {
    user: mongoose.Types.ObjectId;
    type: VerificationRequestType;
    provider: "manual";
    status: VerificationRequestStatus;
    documentType?: string;
    documentFrontUrl?: string | null;
    documentBackUrl?: string | null;
    selfieUrl?: string | null;
    supportingDocumentUrl?: string | null;
    supportingDocumentName?: string | null;
    supportingDocumentMimeType?: string | null;
    note?: string;
    reviewNote?: string;
    reviewedBy?: mongoose.Types.ObjectId | null;
    reviewedAt?: Date | null;
}
declare const _default: mongoose.Model<IVerificationRequest, {}, {}, {}, mongoose.Document<unknown, {}, IVerificationRequest, {}, mongoose.DefaultSchemaOptions> & IVerificationRequest & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IVerificationRequest>;
export default _default;
//# sourceMappingURL=VerificationRequest.d.ts.map