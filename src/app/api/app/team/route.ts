import { getEmployeeFromAuthHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { corsError, corsJson, corsPreflight } from "@/lib/http";
import { todayPK } from "@/lib/datetime";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  const employee = await getEmployeeFromAuthHeader(request);
  if (!employee) return corsError("Unauthorized", 401);
  if (employee.role !== "SUPERVISOR") return corsError("Supervisor role required", 403);

  const projectIds = employee.assignments.map((a) => a.projectId);
  if (projectIds.length === 0) {
    return corsJson({ date: todayPK(), team: [] });
  }

  const today = todayPK();
  const linked = await prisma.projectAssignment.findMany({
    where: { projectId: { in: projectIds } },
    select: { employeeId: true },
  });
  const staffIds = [...new Set(linked.map((row) => row.employeeId))];

  const staff = await prisma.employee.findMany({
    where: {
      id: { in: staffIds },
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      designation: true,
      role: true,
      phone: true,
      assignments: {
        where: { projectId: { in: projectIds } },
        include: { project: { select: { id: true, name: true, type: true } } },
      },
      attendance: { where: { date: today }, take: 1 },
      reports: { where: { date: today }, include: { project: { select: { id: true, name: true } } } },
    },
    orderBy: { name: "asc" },
  });

  return corsJson({
    date: today,
    team: staff.map((member) => {
      const attendance = member.attendance[0] || null;
      return {
        id: member.id,
        name: member.name,
        employeeCode: member.employeeCode,
        designation: member.designation,
        role: member.role === "SUPERVISOR" ? "SUPERVISOR" : "STAFF",
        phone: member.phone,
        projects: member.assignments.map((a) => a.project),
        checkedIn: Boolean(attendance),
        checkedOut: Boolean(attendance?.checkOutAt),
        checkInAt: attendance?.checkInAt || null,
        checkOutAt: attendance?.checkOutAt || null,
        reports: member.reports,
      };
    }),
  });
}
