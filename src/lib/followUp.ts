import { z } from "zod";

export const FOLLOW_UP_STORAGE_KEY = "leadscale.followUps.v1";

export const FollowUpStatusSchema = z.enum([
  "NEW",
  "CONTACTED",
  "TOUR_SCHEDULED",
  "NURTURE",
  "DONE",
]);

export const FollowUpRecordSchema = z
  .object({
    status: FollowUpStatusSchema,
    dueDate: z.iso.date().optional(),
  })
  .strict();

export const FollowUpRecordsSchema = z.record(
  z.string(),
  FollowUpRecordSchema,
);

export type FollowUpStatus = z.infer<typeof FollowUpStatusSchema>;
export type FollowUpRecord = z.infer<typeof FollowUpRecordSchema>;
export type FollowUpRecords = z.infer<typeof FollowUpRecordsSchema>;

export const FOLLOW_UP_STATUS_LABELS: Record<FollowUpStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  TOUR_SCHEDULED: "Tour scheduled",
  NURTURE: "Nurture",
  DONE: "Handled",
};

export function isFollowUpDue(
  record: FollowUpRecord | undefined,
  today: string,
): boolean {
  return Boolean(
    record &&
      record.status !== "DONE" &&
      record.dueDate &&
      record.dueDate <= today,
  );
}

export function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
