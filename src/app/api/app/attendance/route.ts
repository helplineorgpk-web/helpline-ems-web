import { getEmployeeFromAuthHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { corsError, corsJson, corsPreflight } from "@/lib/http";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  const employee = await getEmployeeFromAuthHeader(request);
  if (!employee) return corsError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const records = await prisma.attendance.findMany({
    where: {
      employeeId: employee.id,
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    },
    include: { project: true },
    orderBy: { date: "desc" },
    take: 60,
  });

  return corsJson({ records });
}
