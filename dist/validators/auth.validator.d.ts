import { z } from "zod";
export declare const changePasswordSchema: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
}, z.core.$strip>;
export declare const deleteAccountSchema: z.ZodObject<{
    currentPassword: z.ZodString;
    confirmationText: z.ZodLiteral<"DELETE MY ACCOUNT">;
}, z.core.$strip>;
//# sourceMappingURL=auth.validator.d.ts.map