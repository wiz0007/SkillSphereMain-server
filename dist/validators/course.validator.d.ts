import { z } from "zod";
export declare const createCourseSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    type: z.ZodDefault<z.ZodEnum<{
        live: "live";
        recorded: "recorded";
        tuition: "tuition";
    }>>;
    category: z.ZodString;
    skills: z.ZodDefault<z.ZodArray<z.ZodString>>;
    price: z.ZodPipe<z.ZodUnion<readonly [z.ZodNumber, z.ZodString]>, z.ZodTransform<number, string | number>>;
    duration: z.ZodString;
    contentDriveLink: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    tuitionSchedule: z.ZodOptional<z.ZodObject<{
        days: z.ZodDefault<z.ZodArray<z.ZodString>>;
        weeks: z.ZodDefault<z.ZodArray<z.ZodNumber>>;
        startTime: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>>;
    level: z.ZodEnum<{
        Beginner: "Beginner";
        Intermediate: "Intermediate";
        Advanced: "Advanced";
    }>;
}, z.core.$strip>;
export declare const ratingSchema: z.ZodObject<{
    value: z.ZodNumber;
}, z.core.$strip>;
export declare const reviewSchema: z.ZodObject<{
    rating: z.ZodNumber;
    comment: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=course.validator.d.ts.map