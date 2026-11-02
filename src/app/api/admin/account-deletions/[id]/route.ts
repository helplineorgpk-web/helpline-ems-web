import { getAdminSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getAccountDeletionRequest } from "@/lib/account-deletions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id } = await params;
  try {
    const detail = await getAccountDeletionRequest(id);
    if (!detail) return jsonError("Request not found", 404);
    return jsonOk({
      ...detail,
      canCompleteDeletion: session.canDeleteAccounts,
    });
  } catch (error) {
    console.error("GET /api/admin/account-deletions/[id] failed", error instanceof Error ? error.message : error);
    return jsonError("Could not load deletion request", 500);
  }
}
