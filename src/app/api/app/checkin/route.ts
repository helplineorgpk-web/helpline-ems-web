import { z } from "zod";
import { getEmployeeFromAuthHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { corsError, corsJson, corsPreflight } from "@/lib/http";
import { todayPK } from "@/lib/datetime";

const schema = z.object({
  projectId: z.string().optional(),
});

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: Request) {
  const employee = await getEmployeeFromAuthHeader(request);
  if (!employee) return corsError("Unauthorized", 401);

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  const projectId = parsed.success ? parsed.data.projectId : undefined;

  if (projectId) {
    const assigned = employee.assignments.some((a) => a.projectId === projectId);
    if (!assigned) return corsError("You are not assigned to this project", 403);
  }

  const today = todayPK();
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });
  if (existing) {
    return corsJson({ attendance: existing, alreadyCheckedIn: true });
  }

  const attendance = await prisma.attendance.create({
    data: {
      employeeId: employee.id,
      projectId: projectId || employee.assignments[0]?.projectId || null,
      date: today,
      checkInAt: new Date(),
    },
    include: { project: true },
  });

  return corsJson({ attendance, alreadyCheckedIn: false }, 201);
}
