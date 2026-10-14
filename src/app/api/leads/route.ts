import { LeadSchema } from "../../../../lib/types/lead";
import { getLeadRepository } from "../../../../lib/data";
import { getMockSimulation, waitForDemoSimulation } from "../../../../lib/demo/simulations";
import { guardProtectedRoute } from "../../../../lib/security/routeGuard";
import { ROUTE_SECURITY_CONFIG } from "../../../../lib/security/config";

export async function GET(request: Request): Promise<Response> {
  const accessError = guardProtectedRoute(request, "intake");
  if (accessError) return accessError;
  const simulation = getMockSimulation(request);
  if (simulation === "empty") return Response.json([], { headers: { "x-total-count": "0" } });
  if (simulation === "error") return Response.json({ error: { code: "LEADS_UNAVAILABLE", message: "Leads could not be retrieved." } }, { status: 500 });
  await waitForDemoSimulation(simulation);
  const query = new URL(request.url).searchParams;
  const offset = Number(query.get("offset") ?? 0);
  const limit = Number(query.get("limit") ?? ROUTE_SECURITY_CONFIG.maxPrioritizeLeads);
  if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > ROUTE_SECURITY_CONFIG.maxPrioritizeLeads) {
    return Response.json({ error: { code: "INVALID_PAGINATION", message: "Use a non-negative offset and a limit from 1 through 12." } }, { status: 400 });
  }
  try {
    const leads = await getLeadRepository().list();
    const uiLeads = leads.slice(offset, offset + limit).map((lead) => ({ ...lead, rawSourceData: {} }));
    return Response.json(LeadSchema.array().parse(uiLeads), {
      headers: {
        "cache-control": "no-store",
        "x-total-count": String(leads.length),
        "x-page-offset": String(offset),
        "x-page-limit": String(limit),
      },
    });
  } catch {
    return Response.json(
      { error: { code: "LEADS_UNAVAILABLE", message: "Leads could not be retrieved." } },
      { status: 500 },
    );
  }
}