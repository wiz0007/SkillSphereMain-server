import { z } from "zod";
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z
        .string()
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/, "Weak password"),
});
export const deleteAccountSchema = z.object({
    currentPassword: z.string().min(1),
    confirmationText: z.literal("DELETE MY ACCOUNT"),
});
export const rechargeSkillCoinSchema = z.object({
    amount: z.number().min(1).max(100000),
    gatewayReference: z.string().optional(),
});
export const verifyWalletRechargeSchema = z.object({
    razorpayOrderId: z.string().min(1),
    razorpayPaymentId: z.string().min(1),
    razorpaySignature: z.string().min(1),
});
//# sourceMappingURL=auth.validator.js.map