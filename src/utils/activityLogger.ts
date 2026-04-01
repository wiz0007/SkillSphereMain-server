import Activity from "../models/Activity.js";

export const logActivity = async ({
  user,
  type,
  action,
  entityId,
  metadata,
}: any) => {
  try {
    await Activity.create({
      user,
      type,
      action,
      entityId,
      metadata,
    });
  } catch (error) {
    console.error("Activity log failed");
  }
};