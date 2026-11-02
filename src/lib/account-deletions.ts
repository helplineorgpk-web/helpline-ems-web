import { prisma } from "./prisma";
import { contains } from "./search";
import { isObjectId } from "./object-id";
import { normalizeAppRole } from "./constants";

const OPEN_STATUSES = ["PENDING", "PROCESSING"] as const;

export type DeletionActor = {
  id: string;
  name: string;
  canDeleteAccounts: boolean;
};

type Failure = { error: string; status: number };

function fail(error: string, status: number): Failure {
  return { error, status };
}

function isFailure(value: unknown): value is Failure {
  return Boolean(value && typeof value === "object" && "error" in value);
}

function codesMatch(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

async function removalCounts(employeeId: string) {
  const [assignments, attendance, reports] = await Promise.all([
    prisma.projectAssignment.count({ where: { employeeId } }),
    prisma.attendance.count({ where: { employeeId } }),
    prisma.dailyReport.count({ where: { employeeId } }),
  ]);
  return { assignments, attendance, reports };
}

function impactNote(counts: { assignments: number; attendance: number; reports: number }, existed: boolean) {
  if (!existed) {
    return "The employee account was already gone. This request was closed without deleting additional records.";
  }
  return `Permanently deleted the account. Removed ${counts.assignments} project assignments, ${counts.attendance} attendance records, and ${counts.reports} daily reports.`;
}

async function closeDeletionRequest(
  requestId: string,
  admin: DeletionActor,
  counts: { assignments: number; attendance: number; reports: number },
  existed: boolean,
  primary: boolean
) {
  const updated = await prisma.accountDeletionRequest.update({
    where: { id: requestId },
    data: {
      employeeId: null,
      status: "COMPLETED",
      completedAt: new Date(),
      completedByAdminId: admin.id,
      completedByAdminName: admin.name,
      removedAssignments: counts.assignments,
      removedAttendance: counts.attendance,
      removedReports: counts.reports,
    },
  });
  if (updated.status !== "COMPLETED") {
    throw new Error("Deletion request status did not change to completed");
  }

  await prisma.accountDeletionEvent
    .create({
      data: {
        requestId,
        action: "COMPLETED",
        actorName: admin.name,
        actorRole: "admin",
        adminId: admin.id,
        note: primary
          ? impactNote(counts, existed)
          : "Closed because the employee account was permanently deleted.",
      },
    })
    .catch((error) => {
      console.error(
        "Could not record account deletion history",
        error instanceof Error ? error.message : error
      );
    });
}

async function eraseEmployeeAndCloseRequests(
  employeeId: string,
  admin: DeletionActor,
  primaryRequestId?: string
) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return { existed: false as const, counts: { assignments: 0, attendance: 0, reports: 0 } };

  const counts = await removalCounts(employeeId);
  const openRequests = await prisma.accountDeletionRequest.findMany({
    where: { employeeId, status: { in: [...OPEN_STATUSES] } },
  });

  await prisma.employee.delete({ where: { id: employeeId } });

  for (const request of openRequests) {
    const primary = request.id === primaryRequestId;
    await closeDeletionRequest(request.id, admin, counts, true, primary);
  }

  return { existed: true as const, counts, employee };
}

export async function submitAccountDeletionRequest(employeeId: string, reason?: string | null) {
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.status !== "ACTIVE") return fail("Unauthorized", 401);

  const existing = await prisma.accountDeletionRequest.findFirst({
    where: { employeeId, status: { in: [...OPEN_STATUSES] } },
    orderBy: { requestedAt: "desc" },
  });
  if (existing) return fail("A deletion request is already open for this account", 409);

  const trimmed = reason?.trim() || null;
  const request = await prisma.accountDeletionRequest.create({
    data: {
      employeeId: employee.id,
      employeeCode: employee.employeeCode,
      employeeName: employee.name,
      employeeEmail: employee.email || null,
      employeePhone: employee.phone,
      designation: employee.designation,
      appRole: normalizeAppRole(employee.role),
      employeeStatus: employee.status,
      reason: trimmed,
      status: "PENDING",
      events: {
        create: {
          action: "SUBMITTED",
          actorName: employee.name,
          actorRole: "employee",
          note: trimmed,
        },
      },
    },
  });

  await prisma.notification.create({
    data: {
      type: "ACCOUNT_DELETION",
      title: "Account deletion request",
      body: `${employee.name} (${employee.employeeCode}) requested account deletion.`,
      employeeId: employee.id,
      deletionRequestId: request.id,
      read: false,
    },
  });

  return { request: { id: request.id, status: request.status, requestedAt: request.requestedAt } };
}

export async function getOwnAccountDeletionRequest(employeeId: string) {
  return prisma.accountDeletionRequest.findFirst({
    where: { employeeId },
    orderBy: { requestedAt: "desc" },
    select: {
      id: true,
      status: true,
      reason: true,
      requestedAt: true,
      processingAdminName: true,
      processingStartedAt: true,
      completedAt: true,
    },
  });
}

export async function listAccountDeletionRequests(q?: string, status?: string) {
  if (status && !["PENDING", "PROCESSING", "COMPLETED"].includes(status)) {
    return fail("Invalid status", 400);
  }

  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { employeeName: contains(q) },
            { employeeCode: contains(q) },
            { employeeEmail: contains(q) },
            { processingAdminName: contains(q) },
            { completedByAdminName: contains(q) },
          ],
        }
      : {}),
  };

  const [rows, total, pending, processing, completed] = await Promise.all([
    prisma.accountDeletionRequest.findMany({
      where,
      orderBy: { requestedAt: "desc" },
      include: { employee: { select: { email: true } } },
    }),
    prisma.accountDeletionRequest.count(),
    prisma.accountDeletionRequest.count({ where: { status: "PENDING" } }),
    prisma.accountDeletionRequest.count({ where: { status: "PROCESSING" } }),
    prisma.accountDeletionRequest.count({ where: { status: "COMPLETED" } }),
  ]);

  return {
    requests: rows.map((row) => ({
      id: row.id,
      employeeName: row.employeeName,
      employeeCode: row.employeeCode,
      email: row.employee?.email || row.employeeEmail || null,
      requestedAt: row.requestedAt,
      status: row.status,
      processingAdministrator: row.processingAdminName || null,
    })),
    stats: { total, pending, processing, completed },
  };
}

export async function getAccountDeletionRequest(id: string) {
  if (!isObjectId(id)) return null;
  const request = await prisma.accountDeletionRequest.findUnique({
    where: { id },
    include: {
      events: { orderBy: { createdAt: "asc" } },
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          employeeCode: true,
          designation: true,
          role: true,
          status: true,
          assignments: {
            include: { project: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  if (!request) return null;

  const live = request.employee;
  const projects = live?.assignments.flatMap((row) => (row.project ? [row.project] : [])) ?? [];
  const liveCounts = live ? await removalCounts(live.id) : null;
  const accountExists = Boolean(live);

  return {
    request: {
      id: request.id,
      status: request.status,
      reason: request.reason,
      requestedAt: request.requestedAt,
      employeeName: request.employeeName,
      employeeCode: request.employeeCode,
      employeeEmail: request.employeeEmail,
      employeePhone: request.employeePhone,
      designation: request.designation,
      appRole: request.appRole,
      employeeStatus: request.employeeStatus,
      processingAdministrator: request.processingAdminName,
      processingStartedAt: request.processingStartedAt,
      completedBy: request.completedByAdminName,
      completedAt: request.completedAt,
    },
    employee: live
      ? {
          id: live.id,
          name: live.name,
          email: live.email,
          phone: live.phone,
          employeeCode: live.employeeCode,
          designation: live.designation,
          role: normalizeAppRole(live.role),
          status: live.status,
          projects,
        }
      : null,
    impact: accountExists
      ? {
          accountExists: true,
          assignments: liveCounts?.assignments ?? 0,
          attendance: liveCounts?.attendance ?? 0,
          reports: liveCounts?.reports ?? 0,
        }
      : {
          accountExists: false,
          assignments: request.removedAssignments ?? 0,
          attendance: request.removedAttendance ?? 0,
          reports: request.removedReports ?? 0,
        },
    events: request.events.map((event) => ({
      id: event.id,
      action: event.action,
      actorName: event.actorName,
      actorRole: event.actorRole,
      note: event.note,
      createdAt: event.createdAt,
    })),
  };
}

export async function startProcessingDeletion(id: string, admin: { id: string; name: string }) {
  if (!isObjectId(id)) return fail("Request not found", 404);
  const request = await prisma.accountDeletionRequest.findUnique({ where: { id } });
  if (!request) return fail("Request not found", 404);
  if (request.status === "PROCESSING") return fail("This request is already being processed", 409);
  if (request.status !== "PENDING") return fail("Only pending requests can be moved to processing", 409);

  await prisma.accountDeletionRequest.update({
    where: { id },
    data: {
      status: "PROCESSING",
      processingAdminId: admin.id,
      processingAdminName: admin.name,
      processingStartedAt: new Date(),
      events: {
        create: {
          action: "PROCESSING_STARTED",
          actorName: admin.name,
          actorRole: "admin",
          adminId: admin.id,
        },
      },
    },
  });

  return { ok: true as const };
}

export async function completeAccountDeletion(id: string, admin: DeletionActor, employeeCode: string) {
  if (!admin.canDeleteAccounts) {
    return fail("Only authorized administrators can permanently delete accounts", 403);
  }
  if (!isObjectId(id)) return fail("Request not found", 404);

  const request = await prisma.accountDeletionRequest.findUnique({ where: { id } });
  if (!request) return fail("Request not found", 404);
  if (request.status === "COMPLETED") return fail("This request is already completed", 409);
  if (request.status !== "PROCESSING") {
    return fail("Start processing before completing account deletion", 409);
  }
  if (!codesMatch(request.employeeCode, employeeCode)) {
    return fail("Employee ID does not match this request", 400);
  }

  if (request.employeeId) {
    const employee = await prisma.employee.findUnique({ where: { id: request.employeeId } });
    if (employee && !codesMatch(employee.employeeCode, request.employeeCode)) {
      return fail("Employee record does not match this request", 409);
    }
    if (employee) {
      await eraseEmployeeAndCloseRequests(employee.id, admin, request.id);
      return { ok: true as const };
    }
  }

  await closeDeletionRequest(
    request.id,
    admin,
    { assignments: 0, attendance: 0, reports: 0 },
    false,
    true
  );

  return { ok: true as const };
}

export async function deleteEmployeeAccount(employeeId: string, admin: DeletionActor) {
  if (!admin.canDeleteAccounts) {
    return fail("Only authorized administrators can permanently delete accounts", 403);
  }
  if (!isObjectId(employeeId)) return fail("Employee not found", 404);
  const result = await eraseEmployeeAndCloseRequests(employeeId, admin);
  if (!result.existed) return fail("Employee not found", 404);
  return { ok: true as const };
}

export { isFailure };
