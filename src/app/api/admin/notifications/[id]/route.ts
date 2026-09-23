import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_request: Request, { params }: Params) {
  const { id } = await params;
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) return jsonError("Notification not found", 404);

  const updated = await prisma.notification.update({
    where: { id },
    data: { read: true, readAt: notification.readAt || new Date() },
  });

  return jsonOk({ notification: updated });
}
