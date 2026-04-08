import Activity from "../models/Activity.js";

interface LogActivityParams {
  user: string;
  type: "SESSION" | "COURSE" | "SYSTEM";
  action: string;
  entityId?: any;
  metadata?: any;
}

export const logActivity = async ({
  user,
  type,
  action,
  entityId,
  metadata,
}: LogActivityParams) => {
  try {
    await Activity.create({
      user,
      type,
      action,
      entityId,
      metadata,
    });
  } catch (err) {
    console.error("ACTIVITY LOG ERROR:", err);
  }
};