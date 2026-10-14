import { LeadDetailResponseSchema } from "../../../../../lib/types/api";
import { getLeadRepository } from "../../../../../lib/data";
import { guardProtectedRoute } from "../../../../../lib/security/routeGuard";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const accessError = guardProtectedRoute(request, "intake");
  if (accessError) return accessError;
  const { id } = await context.params;
  if (!id.trim()) return Response.json({ error: { code: "INVALID_REQUEST", message: "Lead ID is required." } }, { status: 400 });
  try {
    const repository = getLeadRepository();
    const lead = await repository.getById(id);
    if (!lead) return Response.json({ error: { code: "LEAD_NOT_FOUND", message: "Lead was not found." } }, { status: 404 });
    const assessments = await repository.getLatestAssessments([id]);
    const response = LeadDetailResponseSchema.parse({
      lead: { ...lead, rawSourceData: {} },
      ...(assessments[id] ? { assessment: assessments[id].assessment } : {}),
    });
    return Response.json(response, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: { code: "LEAD_UNAVAILABLE", message: "Lead details could not be retrieved." } }, { status: 500 });
  }
}