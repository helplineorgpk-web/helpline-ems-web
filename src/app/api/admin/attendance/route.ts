import { prisma } from "@/lib/prisma";
import { jsonOk } from "@/lib/http";
import { todayPK } from "@/lib/datetime";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || todayPK();
  const projectId = searchParams.get("projectId") || undefined;
  const employeeId = searchParams.get("employeeId") || undefined;

  const [records, employees] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        date,
        ...(projectId ? { projectId } : {}),
        ...(employeeId ? { employeeId } : {}),
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            designation: true,
            employeeCode: true,
            phone: true,
            status: true,
          },
        },
        project: { select: { id: true, name: true, type: true, code: true } },
      },
      orderBy: { checkInAt: "asc" },
    }),
    prisma.employee.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, designation: true, employeeCode: true, phone: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const presentIds = new Set(records.map((r) => r.employeeId));
  const absent = employeeId
    ? []
    : employees.filter((e) => !presentIds.has(e.id));

  return jsonOk({
    date,
    records,
    absent,
    summary: {
      present: records.length,
      checkedOut: records.filter((r) => r.checkOutAt).length,
      onDuty: records.filter((r) => !r.checkOutAt).length,
      absent: absent.length,
    },
  });
}
