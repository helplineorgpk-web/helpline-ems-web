import { z } from "zod";
import { getEmployeeFromAuthHeader } from "@/lib/auth";
import { corsError, corsJson, corsPreflight } from "@/lib/http";
import {
  getOwnAccountDeletionRequest,
  isFailure,
  submitAccountDeletionRequest,
} from "@/lib/account-deletions";

const schema = z.object({
  reason: z.string().max(1000).optional(),
});

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  const employee = await getEmployeeFromAuthHeader(request);
  if (!employee) return corsError("Unauthorized", 401);

  const deletionRequest = await getOwnAccountDeletionRequest(employee.id);
  return corsJson({ request: deletionRequest });
}

export async function POST(request: Request) {
  const employee = await getEmployeeFromAuthHeader(request);
  if (!employee) return corsError("Unauthorized", 401);

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});
  if (!parsed.success) return corsError("Reason must be 1000 characters or fewer");

  try {
    const result = await submitAccountDeletionRequest(employee.id, parsed.data.reason);
    if (isFailure(result)) return corsError(result.error, result.status);
    return corsJson(result, 201);
  } catch (error) {
    console.error("POST /api/app/account-deletion failed", error instanceof Error ? error.message : error);
    return corsError("Could not submit deletion request", 500);
  }
}
