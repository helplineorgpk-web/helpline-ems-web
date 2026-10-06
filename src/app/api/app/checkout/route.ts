import { getEmployeeFromAuthHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { corsError, corsJson, corsPreflight } from "@/lib/http";
import { todayPK } from "@/lib/datetime";

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: Request) {
  const employee = await getEmployeeFromAuthHeader(request);
  if (!employee) return corsError("Unauthorized", 401);

  const today = todayPK();
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });

  if (!existing) {
    return corsError("Please check in before checking out", 400);
  }

  const progressCount = await prisma.dailyReport.count({
    where: { employeeId: employee.id, date: today },
  });
  if (progressCount === 0) {
    return corsError("Write today's daily report before you check out", 400);
  }

  if (existing.checkOutAt) {
    const attendance = await prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOutAt: new Date() },
      include: { project: true },
    });
    return corsJson({ attendance, alreadyCheckedOut: false });
  }

  const attendance = await prisma.attendance.update({
    where: { id: existing.id },
    data: { checkOutAt: new Date() },
    include: { project: true },
  });

  await prisma.notification.create({
    data: {
      type: "CHECKOUT",
      title: "Check-out",
      body: attendance.project
        ? `${employee.name} checked out from ${attendance.project.name}`
        : `${employee.name} checked out`,
      employeeId: employee.id,
      projectId: attendance.projectId,
      read: false,
    },
  });

  return corsJson({ attendance, alreadyCheckedOut: false });
}
