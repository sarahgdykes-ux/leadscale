import { z } from "zod";
import { AGENT_PROMPT_VERSION } from "../agent/promptVersion";

export const StatusApiResponseSchema = z.object({
  status: z.literal("ok"),
  mode: z.enum(["mock", "live"]),
  backend: z.enum(["memory", "supabase"]),
  promptVersion: z.literal(AGENT_PROMPT_VERSION),
  counts: z.object({
    leads: z.number().int().nonnegative(),
    scored: z.number().int().nonnegative(),
    rejected: z.number().int().nonnegative(),
    fallback: z.number().int().nonnegative(),
    fallbackRate: z.number().min(0).max(1),
    runs: z.number().int().nonnegative(),
  }).strict(),
}).strict();