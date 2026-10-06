import { prisma } from "@/lib/prisma";
import { jsonOk } from "@/lib/http";

export async function GET() {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.notification.count({ where: { read: false } }),
  ]);

  const reportIds = notifications.flatMap((item) => (item.reportId ? [item.reportId] : []));
  const reports = reportIds.length
    ? await prisma.dailyReport.findMany({
        where: { id: { in: reportIds } },
        select: { id: true },
      })
    : [];
  const existing = new Set(reports.map((report) => report.id));

  return jsonOk({
    notifications: notifications.map((item) =>
      item.reportId && !existing.has(item.reportId) ? { ...item, reportId: null } : item
    ),
    unreadCount,
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (body?.action === "read-all") {
    await prisma.notification.updateMany({
      where: { read: false },
      data: { read: true, readAt: new Date() },
    });
  }
  return jsonOk({ ok: true });
}
