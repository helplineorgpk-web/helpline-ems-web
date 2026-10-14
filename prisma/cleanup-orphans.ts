// Removes rows that point at deleted employees or projects. Older deletes on the live database
// (not a replica set) skipped Prisma's cascades and left these behind, which makes pages 500.
//
//   npm run db:cleanup-orphans                 # dry run against DATABASE_URL
//   npm run db:cleanup-orphans -- --apply      # actually fix
//   DATABASE_URL="mongodb://..." npm run db:cleanup-orphans   # target another database
//
// Without a replica set, Prisma logs "needs to perform transactions" errors before each write
// is retried through standalone-write. Those are expected; check the counts on a dry re-run.
import { getDatabaseUrl } from "../src/lib/env";
import { prisma } from "../src/lib/prisma";

const apply = process.argv.includes("--apply");

async function main() {
  const host = getDatabaseUrl().replace(/\/\/[^@\s]+@/, "//***@").split("?")[0];
  console.log(`${apply ? "Fixing" : "Dry run on"} ${host}\n`);

  const [employees, projects] = await Promise.all([
    prisma.employee.findMany({ select: { id: true } }),
    prisma.project.findMany({ select: { id: true } }),
  ]);
  const employeeIds = new Set(employees.map((row) => row.id));
  const projectIds = new Set(projects.map((row) => row.id));

  const [assignments, attendance, reports] = await Promise.all([
    prisma.projectAssignment.findMany({ select: { id: true, employeeId: true, projectId: true } }),
    prisma.attendance.findMany({ select: { id: true, employeeId: true, projectId: true } }),
    prisma.dailyReport.findMany({ select: { id: true, employeeId: true, projectId: true } }),
  ]);

  const badAssignments = assignments
    .filter((row) => !employeeIds.has(row.employeeId) || !projectIds.has(row.projectId))
    .map((row) => row.id);
  const badAttendance = attendance.filter((row) => !employeeIds.has(row.employeeId)).map((row) => row.id);
  const detachAttendance = attendance
    .filter((row) => employeeIds.has(row.employeeId) && row.projectId && !projectIds.has(row.projectId))
    .map((row) => row.id);
  const badReports = reports
    .filter((row) => !employeeIds.has(row.employeeId) || !projectIds.has(row.projectId))
    .map((row) => row.id);

  console.log(`Assignments to delete:              ${badAssignments.length}`);
  console.log(`Attendance to delete (no employee): ${badAttendance.length}`);
  console.log(`Attendance to unlink (no project):  ${detachAttendance.length}`);
  console.log(`Reports to delete:                  ${badReports.length}`);

  if (!apply) {
    console.log("\nNothing changed. Re-run with --apply to fix.");
    return;
  }

  if (badAssignments.length) await prisma.projectAssignment.deleteMany({ where: { id: { in: badAssignments } } });
  if (badAttendance.length) await prisma.attendance.deleteMany({ where: { id: { in: badAttendance } } });
  if (detachAttendance.length) {
    await prisma.attendance.updateMany({ where: { id: { in: detachAttendance } }, data: { projectId: null } });
  }
  if (badReports.length) await prisma.dailyReport.deleteMany({ where: { id: { in: badReports } } });
  console.log("\nDone.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
