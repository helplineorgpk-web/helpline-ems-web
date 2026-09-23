import { prisma } from "@/lib/prisma";
import { jsonOk } from "@/lib/http";
import { todayPK } from "@/lib/datetime";

export async function GET() {
  const today = todayPK();

  const [
    projectCount,
    employeeCount,
    activeEmployeeCount,
    todayCheckins,
    todayCheckouts,
    todayReports,
    recentReports,
    todayAttendance,
    projects,
  ] = await Promise.all([
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.employee.count(),
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.attendance.count({ where: { date: today } }),
    prisma.attendance.count({ where: { date: today, checkOutAt: { not: null } } }),
    prisma.dailyReport.count({ where: { date: today } }),
    prisma.dailyReport.findMany({
      where: { date: today },
      take: 12,
      orderBy: { createdAt: "desc" },
      include: {
        employee: { select: { id: true, name: true, employeeCode: true } },
        project: { select: { id: true, name: true, type: true } },
      },
    }),
    prisma.attendance.findMany({
      where: { date: today },
      orderBy: { checkInAt: "asc" },
      include: {
        employee: { select: { id: true, name: true, designation: true, employeeCode: true } },
        project: { select: { id: true, name: true, type: true } },
      },
    }),
    prisma.project.findMany({
      where: { status: "ACTIVE" },
      include: { _count: { select: { assignments: true, reports: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const typeCounts = projects.reduce<Record<string, number>>((acc, project) => {
    acc[project.type] = (acc[project.type] || 0) + 1;
    return acc;
  }, {});

  return jsonOk({
    today,
    stats: {
      projectCount,
      employeeCount,
      activeEmployeeCount,
      todayCheckins,
      todayCheckouts,
      todayReports,
      stillOnDuty: todayCheckins - todayCheckouts,
    },
    typeCounts,
    recentReports,
    todayAttendance,
    projects,
  });
}
