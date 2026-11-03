import { closeOverdueAttendance } from "@/lib/attendance";
import { jsonError, jsonOk } from "@/lib/http";

// Called daily at 8:00 PM Pakistan time (15:00 UTC) by the cron in vercel.json.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return jsonError("CRON_SECRET is not set", 503);
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return jsonError("Unauthorized", 401);

  const closed = await closeOverdueAttendance();
  return jsonOk({ closed });
}
