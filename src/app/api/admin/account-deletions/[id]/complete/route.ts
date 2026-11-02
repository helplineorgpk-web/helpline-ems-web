import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { completeAccountDeletion, isFailure } from "@/lib/account-deletions";

const schema = z.object({
  employeeCode: z.string().min(1),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await getAdminSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!session.canDeleteAccounts) {
    return jsonError("Only authorized administrators can permanently delete accounts", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Enter the employee ID to confirm deletion");

  const { id } = await params;
  try {
    const result = await completeAccountDeletion(
      id,
      { id: session.sub, name: session.name, canDeleteAccounts: true },
      parsed.data.employeeCode
    );
    if (isFailure(result)) return jsonError(result.error, result.status);
    return jsonOk(result);
  } catch (error) {
    console.error(
      "POST /api/admin/account-deletions/[id]/complete failed",
      error instanceof Error ? error.message : error
    );
    return jsonError("Could not delete the account", 500);
  }
}
