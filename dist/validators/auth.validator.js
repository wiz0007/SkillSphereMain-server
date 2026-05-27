import { z } from "zod";
export const changePasswordSchema = z.object({
    currentPassword: z.string().trim().optional(),
    newPassword: z
        .string()
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/, "Weak password"),
});
export const deleteAccountSchema = z.object({
    currentPassword: z.string().min(1),
    confirmationText: z.literal("DELETE MY ACCOUNT"),
});
export const forgotPasswordSchema = z.object({
    email: z.string().email(),
});
export const resetPasswordSchema = z.object({
    token: z.string().min(1),
    newPassword: z
        .string()
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/, "Weak password"),
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
export const requestWithdrawalSchema = z.object({
    amount: z.number().min(1).max(1000000),
    upiId: z
        .string()
        .trim()
        .min(3)
        .max(100)
        .regex(/^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/i, "Invalid UPI ID"),
    note: z.string().trim().max(300).optional(),
});
//# sourceMappingURL=auth.validator.js.map