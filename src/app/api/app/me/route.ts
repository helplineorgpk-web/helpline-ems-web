import { getEmployeeFromAuthHeader, publicEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { corsError, corsJson, corsPreflight } from "@/lib/http";
import { todayPK } from "@/lib/datetime";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  const employee = await getEmployeeFromAuthHeader(request);
  if (!employee) return corsError("Unauthorized", 401);

  const today = todayPK();
  const attendance = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });

  const todayReports = await prisma.dailyReport.findMany({
    where: { employeeId: employee.id, date: today },
    include: { project: true },
    orderBy: { createdAt: "desc" },
  });

  return corsJson({
    employee: publicEmployee(employee),
    projects: employee.assignments.map((a) => a.project),
    today: {
      date: today,
      attendance,
      reports: todayReports,
      checkedIn: Boolean(attendance),
      checkedOut: Boolean(attendance?.checkOutAt),
    },
  });
}
