import { getEmployeeFromAuthHeader, publicEmployee } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { corsError, corsJson, corsPreflight } from "@/lib/http";
import { todayPK } from "@/lib/datetime";
import { AUTO_CHECKOUT_LABEL, closeOverdueAttendance, isAfterAutoCheckout } from "@/lib/attendance";
import { missedReportDays } from "@/lib/late-reports";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  const employee = await getEmployeeFromAuthHeader(request);
  if (!employee) return corsError("Unauthorized", 401);

  await closeOverdueAttendance(employee.id);
  const today = todayPK();
  const missedReports = await missedReportDays(employee.id);
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
    projects: employee.assignments.flatMap((a) => (a.project ? [a.project] : [])),
    today: {
      date: today,
      attendance,
      reports: todayReports.filter((report) => report.project),
      checkedIn: Boolean(attendance),
      checkedOut: Boolean(attendance?.checkOutAt),
      autoCheckedOut: Boolean(attendance?.autoCheckedOut),
      checkinClosed: isAfterAutoCheckout(),
      autoCheckoutTime: AUTO_CHECKOUT_LABEL,
    },
    missedReports,
  });
}
