import { z } from "zod";
import { getEmployeeFromAuthHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { corsError, corsJson, corsPreflight } from "@/lib/http";
import { todayPK } from "@/lib/datetime";
import { closeOverdueAttendance } from "@/lib/attendance";
import { lateReportError } from "@/lib/late-reports";

const schema = z.object({
  projectId: z.string().min(1),
  summary: z.string().min(5),
  details: z.string().min(10),
  // A missed day (YYYY-MM-DD) within the late window. Omit for today.
  date: z.string().optional(),
});

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  const employee = await getEmployeeFromAuthHeader(request);
  if (!employee) return corsError("Unauthorized", 401);

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || undefined;

  const reports = await prisma.dailyReport.findMany({
    where: {
      employeeId: employee.id,
      ...(date ? { date } : {}),
    },
    include: { project: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 120,
  });

  return corsJson({ reports: reports.filter((report) => report.project) });
}

export async function POST(request: Request) {
  const employee = await getEmployeeFromAuthHeader(request);
  if (!employee) return corsError("Unauthorized", 401);

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return corsError("Project, summary and details are required");

  const assigned = employee.assignments.some((a) => a.projectId === parsed.data.projectId);
  if (!assigned) return corsError("You are not assigned to this project", 403);

  const today = todayPK();
  const date = parsed.data.date?.trim() || today;
  const submittedLate = date !== today;
  if (submittedLate) {
    const reason = await lateReportError(employee.id, date);
    if (reason) return corsError(reason, 400);
  }

  await closeOverdueAttendance(employee.id);
  const attendance = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date } },
  });

  const report = await prisma.dailyReport.create({
    data: {
      employeeId: employee.id,
      projectId: parsed.data.projectId,
      date,
      summary: parsed.data.summary.trim(),
      details: parsed.data.details.trim(),
      ...(submittedLate ? { submittedLate: true } : {}),
    },
    include: { project: true },
  });

  await prisma.notification.create({
    data: {
      type: "REPORT",
      title: submittedLate ? "Missing report added" : "New daily report",
      body: submittedLate
        ? `${employee.name} added a missed report for ${date} (${report.project?.name ?? "a project"})`
        : `${employee.name} submitted a report for ${report.project?.name ?? "a project"}`,
      reportId: report.id,
      employeeId: employee.id,
      projectId: report.projectId,
      read: false,
    },
  });

  return corsJson({ report, attendance }, 201);
}
