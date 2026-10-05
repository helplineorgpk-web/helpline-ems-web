import { z } from "zod";
import { getAdminSession, hashPassword, verifyPassword } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current password",
  });

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return jsonError("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Current password and a new password are required");
  }

  const admin = await prisma.admin.findUnique({ where: { id: session.sub } });
  if (!admin) return jsonError("Unauthorized", 401);

  const matches = await verifyPassword(parsed.data.currentPassword, admin.passwordHash);
  if (!matches) return jsonError("Current password is incorrect", 401);

  await prisma.admin.update({
    where: { id: admin.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  return jsonOk({ ok: true });
}
