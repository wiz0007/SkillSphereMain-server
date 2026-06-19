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
    documentFrontPublicId?: string | null;
    documentFrontResourceType?: string | null;
    documentFrontDeliveryType?: string | null;
    documentBackUrl?: string | null;
    documentBackPublicId?: string | null;
    documentBackResourceType?: string | null;
    documentBackDeliveryType?: string | null;
    selfieUrl?: string | null;
    selfiePublicId?: string | null;
    selfieResourceType?: string | null;
    selfieDeliveryType?: string | null;
    supportingDocumentUrl?: string | null;
    supportingDocumentPublicId?: string | null;
    supportingDocumentResourceType?: string | null;
    supportingDocumentDeliveryType?: string | null;
    supportingDocumentName?: string | null;
    supportingDocumentMimeType?: string | null;
    note?: string;
    reviewNote?: string;
    reviewedBy?: mongoose.Types.ObjectId | null;
    reviewedAt?: Date | null;
    revokedBy?: mongoose.Types.ObjectId | null;
    revokedAt?: Date | null;
    revocationNote?: string;
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