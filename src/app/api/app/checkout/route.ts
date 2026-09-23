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
  if (existing.checkOutAt) {
    return corsJson({ attendance: existing, alreadyCheckedOut: true });
  }

  const attendance = await prisma.attendance.update({
    where: { id: existing.id },
    data: { checkOutAt: new Date() },
    include: { project: true },
  });

  return corsJson({ attendance, alreadyCheckedOut: false });
}
