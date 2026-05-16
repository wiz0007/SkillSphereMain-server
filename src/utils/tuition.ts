import mongoose from "mongoose";
import Session from "../models/Session.js";

export type TuitionScheduleSnapshot = {
  days: string[];
  weeks: number[];
  startTime: string;
  duration: string;
  durationMinutes: number;
};

export const validTuitionDays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

const dayToIndex: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

export const parseDurationToMinutes = (value: string) => {
  const normalized = value.toLowerCase().trim();

  if (!normalized) {
    return 0;
  }

  const hourMatch = normalized.match(/(\d+)\s*(hr|hrs|hour|hours|h)\b/);
  const minuteMatch = normalized.match(/(\d+)\s*(min|mins|minute|minutes|m)\b/);

  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;

  if (hours || minutes) {
    return hours * 60 + minutes;
  }

  const numericOnly = Number(normalized.replace(/[^\d]/g, ""));
  return Number.isFinite(numericOnly) ? numericOnly : 0;
};

export const getWeekOfMonth = (date: Date) => Math.floor((date.getDate() - 1) / 7) + 1;

export const buildTuitionOccurrenceDates = (
  schedule: TuitionScheduleSnapshot,
  fromDate: Date,
  untilDate: Date
) => {
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);

  const horizon = new Date(untilDate);
  horizon.setHours(23, 59, 59, 999);

  const [hours, minutes] = schedule.startTime
    .split(":")
    .map((part) => Number(part));
  const safeHours = Number.isFinite(hours) ? Number(hours) : 0;
  const safeMinutes = Number.isFinite(minutes) ? Number(minutes) : 0;

  const dates: Date[] = [];

  for (const cursor = new Date(start); cursor <= horizon; cursor.setDate(cursor.getDate() + 1)) {
    const dayName = validTuitionDays.find((day) => dayToIndex[day] === cursor.getDay());
    const weekOfMonth = getWeekOfMonth(cursor);

    if (!dayName || !schedule.days.includes(dayName) || !schedule.weeks.includes(weekOfMonth)) {
      continue;
    }

    const occurrence = new Date(cursor);
    occurrence.setHours(safeHours, safeMinutes, 0, 0);

    if (occurrence > fromDate && occurrence <= untilDate) {
      dates.push(occurrence);
    }
  }

  return dates;
};

export const ensureTuitionSessionsGenerated = async ({
  enrollment,
  course,
  dbSession,
  horizonDays = 60,
}: {
  enrollment: {
    _id: mongoose.Types.ObjectId | string;
    student: mongoose.Types.ObjectId | string;
    tutor: mongoose.Types.ObjectId | string;
    course: mongoose.Types.ObjectId | string;
    approvedAt?: Date | null;
    generatedUntil?: Date | null;
    scheduleSnapshot: TuitionScheduleSnapshot;
    save?: (options?: { session?: mongoose.ClientSession }) => Promise<unknown>;
  };
  course: {
    _id: mongoose.Types.ObjectId | string;
    title: string;
  };
  dbSession?: mongoose.ClientSession;
  horizonDays?: number;
}) => {
  const approvedAt = enrollment.approvedAt ? new Date(enrollment.approvedAt) : new Date();
  const generationStart = enrollment.generatedUntil
    ? new Date(enrollment.generatedUntil)
    : new Date(approvedAt.getTime() - 60 * 1000);
  const generationHorizon = new Date();
  generationHorizon.setDate(generationHorizon.getDate() + horizonDays);

  if (generationStart >= generationHorizon) {
    return;
  }

  const desiredDates = buildTuitionOccurrenceDates(
    enrollment.scheduleSnapshot,
    generationStart,
    generationHorizon
  );

  if (!desiredDates.length) {
    if (enrollment.save) {
      enrollment.generatedUntil = generationHorizon;
      await enrollment.save(dbSession ? { session: dbSession } : undefined);
    }
    return;
  }

  const firstDesiredDate = desiredDates[0]!;
  const lastDesiredDate = desiredDates[desiredDates.length - 1]!;

  const existingSessions = await Session.find({
    tuitionEnrollment: new mongoose.Types.ObjectId(enrollment._id),
    date: {
      $gte: firstDesiredDate,
      $lte: lastDesiredDate,
    },
  })
    .session(dbSession || null)
    .select("date")
    .lean();

  const existingTimestamps = new Set(
    existingSessions.map((session) => new Date(session.date).getTime())
  );

  const sessionsToCreate = desiredDates
    .filter((date) => !existingTimestamps.has(date.getTime()))
    .map((date) => ({
      course: new mongoose.Types.ObjectId(course._id),
      tuitionEnrollment: new mongoose.Types.ObjectId(enrollment._id),
      student: new mongoose.Types.ObjectId(enrollment.student),
      tutor: new mongoose.Types.ObjectId(enrollment.tutor),
      title: `${course.title} tuition`,
      description: "Recurring tuition class generated from the approved monthly timetable.",
      date,
      duration: enrollment.scheduleSnapshot.durationMinutes,
      price: 0,
      skillCoinAmount: 0,
      coinStatus: "settled",
      status: "accepted",
      acceptedAt: approvedAt,
      sessionKind: "tuition",
      billingType: "included_in_tuition",
    }));

  if (sessionsToCreate.length) {
    await Session.create(sessionsToCreate, dbSession ? { session: dbSession } : undefined);
  }

  if (enrollment.save) {
    enrollment.generatedUntil = generationHorizon;
    await enrollment.save(dbSession ? { session: dbSession } : undefined);
  }
};

export const cancelFutureTuitionSessions = async ({
  enrollmentId,
  fromDate = new Date(),
  dbSession,
}: {
  enrollmentId: mongoose.Types.ObjectId | string;
  fromDate?: Date;
  dbSession?: mongoose.ClientSession;
}) => {
  await Session.updateMany(
    {
      tuitionEnrollment: new mongoose.Types.ObjectId(enrollmentId),
      status: "accepted",
      date: { $gte: fromDate },
    },
    {
      $set: {
        status: "cancelled",
      },
    },
    dbSession ? { session: dbSession } : undefined
  );
};
