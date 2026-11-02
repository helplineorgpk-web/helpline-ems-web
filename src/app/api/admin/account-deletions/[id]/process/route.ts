import { getAdminSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { isFailure, startProcessingDeletion } from "@/lib/account-deletions";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id } = await params;
  try {
    const result = await startProcessingDeletion(id, { id: session.sub, name: session.name });
    if (isFailure(result)) return jsonError(result.error, result.status);
    return jsonOk(result);
  } catch (error) {
    console.error(
      "POST /api/admin/account-deletions/[id]/process failed",
      error instanceof Error ? error.message : error
    );
    return jsonError("Could not start processing", 500);
  }
}
