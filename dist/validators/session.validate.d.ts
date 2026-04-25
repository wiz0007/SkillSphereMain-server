import { z } from "zod";
export declare const createSessionSchema: z.ZodObject<{
    courseId: z.ZodString;
    date: z.ZodString;
    duration: z.ZodNumber;
    message: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const updateSessionSchema: z.ZodObject<{
    status: z.ZodEnum<{
        accepted: "accepted";
        completed: "completed";
        cancelled: "cancelled";
    }>;
}, z.core.$strip>;
//# sourceMappingURL=session.validate.d.ts.map