import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { shiftDatePK, todayPK } from "./datetime";

// Duty closes automatically at 8:00 PM Pakistan time every day.
export const AUTO_CHECKOUT_HOUR = 20;
export const AUTO_CHECKOUT_LABEL = "8:00 PM";

// The moment duty closes on a Pakistan calendar date ("YYYY-MM-DD"). Pakistan is UTC+5 all year.
export function autoCheckoutAt(date: string) {
  return new Date(`${date}T${String(AUTO_CHECKOUT_HOUR).padStart(2, "0")}:00:00+05:00`);
}

// True once today's 8 PM has passed: check-in is closed until tomorrow.
export function isAfterAutoCheckout(now = new Date()) {
  return now.getTime() >= autoCheckoutAt(todayPK(now)).getTime();
}

// A record created without a check-out may have no checkOutAt field at all, which `null` alone does not match.
const OPEN: Prisma.AttendanceWhereInput = {
  OR: [{ checkOutAt: null }, { checkOutAt: { isSet: false } }],
};

/**
 * Checks out every open attendance whose 8 PM has passed, at 8 PM of its own day.
 * Runs before any read of attendance and from the daily cron, so the result is the same
 * whether or not the cron fired on time. Safe to run repeatedly.
 */
export async function closeOverdueAttendance(employeeIds?: string | string[], now = new Date()) {
  const today = todayPK(now);
  const lastDueDate = isAfterAutoCheckout(now) ? today : shiftDatePK(today, -1);
  const ids = typeof employeeIds === "string" ? [employeeIds] : employeeIds;
  if (ids && ids.length === 0) return 0;

  const overdue = await prisma.attendance.findMany({
    where: {
      ...(ids ? { employeeId: { in: ids } } : {}),
      date: { lte: lastDueDate },
      ...OPEN,
    },
    select: { id: true, date: true, checkInAt: true },
  });

  for (const row of overdue) {
    const cutoff = autoCheckoutAt(row.date);
    // A check-in made after 8 PM (before this rule existed) closes at its own check-in time.
    const checkOutAt = row.checkInAt > cutoff ? row.checkInAt : cutoff;
    await prisma.attendance.update({
      where: { id: row.id },
      data: { checkOutAt, autoCheckedOut: true },
    });
  }
  return overdue.length;
}
