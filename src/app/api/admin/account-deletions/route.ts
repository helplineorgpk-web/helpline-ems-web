import { getAdminSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { isFailure, listAccountDeletionRequests } from "@/lib/account-deletions";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || undefined;
  const status = searchParams.get("status")?.trim() || undefined;

  try {
    const result = await listAccountDeletionRequests(q, status);
    if (isFailure(result)) return jsonError(result.error, result.status);
    return jsonOk(result);
  } catch (error) {
    console.error("GET /api/admin/account-deletions failed", error instanceof Error ? error.message : error);
    return jsonError("Could not load deletion requests", 500);
  }
}
