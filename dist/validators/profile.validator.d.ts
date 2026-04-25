import { z } from "zod";
export declare const tutorSchema: z.ZodObject<{
    headline: z.ZodString;
    bio: z.ZodString;
    skills: z.ZodArray<z.ZodString>;
    categories: z.ZodArray<z.ZodString>;
    experience: z.ZodOptional<z.ZodNumber>;
    experienceDetails: z.ZodOptional<z.ZodString>;
    education: z.ZodOptional<z.ZodString>;
    portfolioLinks: z.ZodOptional<z.ZodArray<z.ZodString>>;
    languages: z.ZodOptional<z.ZodArray<z.ZodString>>;
    availability: z.ZodBoolean;
    teachingMode: z.ZodOptional<z.ZodEnum<{
        Online: "Online";
        Offline: "Offline";
        Both: "Both";
    }>>;
}, z.core.$strip>;
export declare const createProfileSchema: z.ZodObject<{
    fullName: z.ZodString;
    bio: z.ZodString;
    country: z.ZodString;
    state: z.ZodString;
    city: z.ZodString;
    timezone: z.ZodOptional<z.ZodString>;
    phone: z.ZodString;
    preferredLanguage: z.ZodOptional<z.ZodString>;
    profilePhoto: z.ZodOptional<z.ZodString>;
    dob: z.ZodOptional<z.ZodString>;
    gender: z.ZodOptional<z.ZodEnum<{
        Male: "Male";
        Female: "Female";
        Other: "Other";
    }>>;
}, z.core.$strip>;
export declare const updateProfileSchema: z.ZodObject<{
    username: z.ZodOptional<z.ZodString>;
    fullName: z.ZodOptional<z.ZodString>;
    bio: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    state: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    timezone: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    preferredLanguage: z.ZodOptional<z.ZodString>;
    profilePhoto: z.ZodOptional<z.ZodString>;
    dob: z.ZodOptional<z.ZodString>;
    gender: z.ZodOptional<z.ZodEnum<{
        Male: "Male";
        Female: "Female";
        Other: "Other";
    }>>;
    settings: z.ZodOptional<z.ZodObject<{
        theme: z.ZodOptional<z.ZodEnum<{
            dark: "dark";
            light: "light";
        }>>;
        notifications: z.ZodOptional<z.ZodObject<{
            sessionUpdates: z.ZodOptional<z.ZodBoolean>;
            courseRecommendations: z.ZodOptional<z.ZodBoolean>;
            marketingEmails: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    tutorProfile: z.ZodOptional<z.ZodObject<{
        headline: z.ZodOptional<z.ZodString>;
        bio: z.ZodOptional<z.ZodString>;
        skills: z.ZodOptional<z.ZodArray<z.ZodString>>;
        categories: z.ZodOptional<z.ZodArray<z.ZodString>>;
        experience: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
        experienceDetails: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        education: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        portfolioLinks: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString>>>;
        languages: z.ZodOptional<z.ZodOptional<z.ZodArray<z.ZodString>>>;
        availability: z.ZodOptional<z.ZodBoolean>;
        teachingMode: z.ZodOptional<z.ZodOptional<z.ZodEnum<{
            Online: "Online";
            Offline: "Offline";
            Both: "Both";
        }>>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
//# sourceMappingURL=profile.validator.d.ts.map