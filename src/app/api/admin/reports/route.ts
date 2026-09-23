import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { contains } from "@/lib/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const projectId = searchParams.get("projectId") || undefined;
  const employeeId = searchParams.get("employeeId") || undefined;
  const date = searchParams.get("date") || undefined;

  const reports = await prisma.dailyReport.findMany({
    where: {
      ...(projectId ? { projectId } : {}),
      ...(employeeId ? { employeeId } : {}),
      ...(date ? { date } : {}),
      ...(q
        ? {
            OR: [
              { summary: contains(q) },
              { details: contains(q) },
              { employee: { name: contains(q) } },
              { project: { name: contains(q) } },
            ],
          }
        : {}),
    },
    include: {
      employee: {
        select: { id: true, name: true, employeeCode: true, designation: true, phone: true },
      },
      project: { select: { id: true, name: true, type: true, code: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return jsonOk({ reports });
}
