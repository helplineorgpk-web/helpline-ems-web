import { getAdminSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return jsonError("Unauthorized", 401);
  return jsonOk({
    admin: { id: session.sub, name: session.name, email: session.email },
  });
}
