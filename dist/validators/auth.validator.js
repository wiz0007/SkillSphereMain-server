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
//# sourceMappingURL=auth.validator.js.map