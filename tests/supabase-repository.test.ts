import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SupabaseLeadRepository } from "../lib/data/supabaseLeadRepository";
import type { Database } from "../lib/data/supabaseDatabase.types";
import { LeadSchema } from "../lib/types/lead";

function lead(id: string, address: string) {
  return LeadSchema.parse({
    id,
    source: "manual",
    receivedAt: "2026-10-14T12:00:00.000Z",
    name: "Same Contact",
    email: "same@example.test",
    property: { address },
    budget: { currency: "USD" },
    timeline: {},
    message: "Interested in this property.",
    engagement: { replyCount: 0, viewCount: 0, tourRequestCount: 0 },
    rawSourceData: {},
  });
}

describe("Supabase lead persistence", () => {
  it("upserts by lead ID and retains distinct inquiries sharing contact details", async () => {
    const lookup = {
      in: vi.fn(async () => ({ data: [{ id: "existing-lead" }], error: null })),
    };
    const upsert = vi.fn(async (...args: [unknown[], { onConflict: string }]) => {
      void args;
      return { error: null };
    });
    const builder = {
      select: vi.fn(() => lookup),
      upsert,
    };
    const client = { from: vi.fn(() => builder) } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseLeadRepository(client);

    const result = await repository.saveLeads([
      lead("existing-lead", "15 Oak Road"),
      lead("new-lead", "22 Pine Road"),
    ]);

    expect(result).toEqual({ saved: 1, merged: 1, skipped: 0 });
    expect(client.from).toHaveBeenCalledWith("leads");
    expect(lookup.in).toHaveBeenCalledWith("id", ["existing-lead", "new-lead"]);
    const persistedRows = builder.upsert.mock.calls[0]?.[0];
    expect(persistedRows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "existing-lead",
        dedupe_key: "id:existing-lead",
        email: "same@example.test",
        raw_source_data: {},
        lead: expect.not.objectContaining({ email: expect.anything(), rawSourceData: expect.anything() }),
      }),
      expect.objectContaining({ id: "new-lead", dedupe_key: "id:new-lead" }),
    ]));
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.any(Array),
      { onConflict: "id" },
    );
  });
});