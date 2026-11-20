import { z } from "zod";
import { getEmployeeFromAuthHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { corsError, corsJson, corsPreflight } from "@/lib/http";
import { todayPK } from "@/lib/datetime";
import { AUTO_CHECKOUT_LABEL, closeOverdueAttendance, isAfterAutoCheckout } from "@/lib/attendance";

const schema = z.object({
  projectId: z.string().optional(),
});

// Parsed apart from `schema` so a malformed location can never cost the check-in its project.
const locationSchema = z.object({
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracy: z.number().min(0).nullish(),
      mocked: z.boolean().nullish(),
    })
    .optional(),
  locationStatus: z.enum(["OK", "DENIED", "SERVICES_OFF", "UNAVAILABLE"]).optional(),
});

// Check-in is never refused for a missing location; the reason is stored so the dashboard can show it.
// Older app versions send neither field and leave all of these null.
function locationFields(raw: unknown) {
  const parsed = locationSchema.safeParse(raw);
  const body = parsed.success ? parsed.data : null;
  const loc = body?.location;
  if (loc) {
    return {
      checkInLat: loc.latitude,
      checkInLng: loc.longitude,
      checkInAccuracy: loc.accuracy ?? null,
      checkInMocked: loc.mocked ?? null,
      checkInLocationStatus: "OK",
    };
  }
  return {
    checkInLat: null,
    checkInLng: null,
    checkInAccuracy: null,
    checkInMocked: null,
    checkInLocationStatus: body?.locationStatus && body.locationStatus !== "OK" ? body.locationStatus : null,
  };
}

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

  await closeOverdueAttendance(employee.id);
  if (isAfterAutoCheckout()) {
    return corsError(`Check-in is closed after ${AUTO_CHECKOUT_LABEL}. Duty ends automatically at ${AUTO_CHECKOUT_LABEL}.`, 400);
  }

  const today = todayPK();
  const location = locationFields(body);
  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId: employee.id, date: today } },
  });
  if (existing) {
    if (existing.checkOutAt) {
      // Checking in again after a check-out moves the check-in time, so the location moves with it.
      const attendance = await prisma.attendance.update({
        where: { id: existing.id },
        data: { checkInAt: new Date(), checkOutAt: null, autoCheckedOut: false, ...location },
        include: { project: true },
      });
      return corsJson({ attendance, alreadyCheckedIn: false });
    }
    return corsJson({ attendance: existing, alreadyCheckedIn: true });
  }

  const attendance = await prisma.attendance.create({
    data: {
      employeeId: employee.id,
      projectId: projectId || employee.assignments[0]?.projectId || null,
      date: today,
      checkInAt: new Date(),
      ...location,
    },
    include: { project: true },
  });

  await prisma.notification.create({
    data: {
      type: "CHECKIN",
      title: "Check-in",
      body: attendance.project
        ? `${employee.name} checked in at ${attendance.project.name}`
        : `${employee.name} checked in`,
      employeeId: employee.id,
      projectId: attendance.projectId,
      read: false,
    },
  });

  return corsJson({ attendance, alreadyCheckedIn: false }, 201);
}
