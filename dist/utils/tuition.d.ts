import mongoose from "mongoose";
export type TuitionScheduleSnapshot = {
    days: string[];
    weeks: number[];
    startTime: string;
    duration: string;
    durationMinutes: number;
};
export declare const validTuitionDays: readonly ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export declare const parseDurationToMinutes: (value: string) => number;
export declare const getWeekOfMonth: (date: Date) => number;
export declare const buildTuitionOccurrenceDates: (schedule: TuitionScheduleSnapshot, fromDate: Date, untilDate: Date) => Date[];
export declare const ensureTuitionSessionsGenerated: ({ enrollment, course, dbSession, horizonDays, }: {
    enrollment: {
        _id: mongoose.Types.ObjectId | string;
        student: mongoose.Types.ObjectId | string;
        tutor: mongoose.Types.ObjectId | string;
        course: mongoose.Types.ObjectId | string;
        approvedAt?: Date | null;
        generatedUntil?: Date | null;
        scheduleSnapshot: TuitionScheduleSnapshot;
        save?: (options?: {
            session?: mongoose.ClientSession;
        }) => Promise<unknown>;
    };
    course: {
        _id: mongoose.Types.ObjectId | string;
        title: string;
    };
    dbSession?: mongoose.ClientSession;
    horizonDays?: number;
}) => Promise<void>;
export declare const cancelFutureTuitionSessions: ({ enrollmentId, fromDate, dbSession, }: {
    enrollmentId: mongoose.Types.ObjectId | string;
    fromDate?: Date;
    dbSession?: mongoose.ClientSession;
}) => Promise<void>;
//# sourceMappingURL=tuition.d.ts.map