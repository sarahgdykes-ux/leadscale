import { describe, expect, it } from "vitest";
import {
  FollowUpRecordsSchema,
  isFollowUpDue,
  localDateString,
} from "../src/lib/followUp";

describe("mock follow-up plans", () => {
  it("validates statuses and calendar dates in saved plans", () => {
    expect(
      FollowUpRecordsSchema.safeParse({
        lead1: { status: "TOUR_SCHEDULED", dueDate: "2026-10-15" },
      }).success,
    ).toBe(true);
    expect(
      FollowUpRecordsSchema.safeParse({
        lead1: { status: "CONTACTED", dueDate: "2026-02-30" },
      }).success,
    ).toBe(false);
    expect(
      FollowUpRecordsSchema.safeParse({
        lead1: { status: "WAITING" },
      }).success,
    ).toBe(false);
  });

  it("includes overdue and today's active plans, excluding future and handled plans", () => {
    expect(
      isFollowUpDue(
        { status: "CONTACTED", dueDate: "2026-10-14" },
        "2026-10-15",
      ),
    ).toBe(true);
    expect(
      isFollowUpDue(
        { status: "TOUR_SCHEDULED", dueDate: "2026-10-15" },
        "2026-10-15",
      ),
    ).toBe(true);
    expect(
      isFollowUpDue(
        { status: "NURTURE", dueDate: "2026-10-16" },
        "2026-10-15",
      ),
    ).toBe(false);
    expect(
      isFollowUpDue({ status: "DONE", dueDate: "2026-10-15" }, "2026-10-15"),
    ).toBe(false);
    expect(isFollowUpDue({ status: "NEW" }, "2026-10-15")).toBe(false);
  });

  it("formats the local calendar date without converting through UTC", () => {
    expect(localDateString(new Date(2026, 9, 15, 23, 30))).toBe("2026-10-15");
  });
});
