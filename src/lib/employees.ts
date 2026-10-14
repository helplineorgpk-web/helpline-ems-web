import { asDate, objectId, optionalText, readCollection, text } from "./documents";
import { prisma } from "./prisma";

export async function nextEmployeeCode() {
  const last = await prisma.employee.findFirst({
    orderBy: { employeeCode: "desc" },
    select: { employeeCode: true },
  });
  const n = last ? Number(last.employeeCode.replace(/\D/g, "")) + 1 : 1;
  return `EMP-${String(Number.isFinite(n) ? n : 1).padStart(4, "0")}`;
}

export function serializeEmployee<
  T extends {
    passwordHash?: string;
    role?: string | null;
    assignments?: { project: unknown; assignedAt: Date }[];
    reports?: { project: unknown }[];
  },
>(employee: T) {
  const { passwordHash: _passwordHash, assignments, reports, ...rest } = employee;
  void _passwordHash;
  return {
    ...rest,
    ...(assignments ? { assignments: assignments.filter((row) => row.project) } : {}),
    ...(reports ? { reports: reports.filter((row) => row.project) } : {}),
    role: rest.role === "SUPERVISOR" ? "SUPERVISOR" : "STAFF",
  };
}

function present<T>(value: T | null | undefined): value is T {
  return value != null;
}

type ProjectRow = {
  id: string;
  name: string;
  code: string;
  type: string;
  location: string | null;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

function mapProject(doc: Record<string, unknown>): ProjectRow | null {
  const id = objectId(doc._id);
  if (!id) return null;
  return {
    id,
    name: text(doc.name, "Untitled project"),
    code: text(doc.code),
    type: text(doc.type, "other"),
    location: optionalText(doc.location),
    description: optionalText(doc.description),
    status: text(doc.status, "ACTIVE"),
    createdAt: asDate(doc.createdAt),
    updatedAt: asDate(doc.updatedAt ?? doc.createdAt),
  };
}

function mapEmployee(doc: Record<string, unknown>) {
  const id = objectId(doc._id);
  if (!id) return null;
  return {
    id,
    employeeCode: text(doc.employeeCode, "EMP-0000"),
    name: text(doc.name, "Unnamed"),
    email: text(doc.email),
    phone: optionalText(doc.phone),
    designation: text(doc.designation),
    role: text(doc.role, "STAFF"),
    status: text(doc.status, "ACTIVE"),
    createdAt: asDate(doc.createdAt),
    updatedAt: asDate(doc.updatedAt ?? doc.createdAt),
  };
}

function projectsById(docs: Record<string, unknown>[]) {
  return new Map(
    docs
      .map(mapProject)
      .filter((project): project is ProjectRow => Boolean(project))
      .map((project) => [project.id, project]),
  );
}

function mapAssignment(doc: Record<string, unknown>, projects: Map<string, ProjectRow>) {
  const id = objectId(doc._id);
  const employeeId = objectId(doc.employeeId);
  const projectId = objectId(doc.projectId);
  if (!id || !employeeId) return null;
  return {
    id,
    employeeId,
    projectId,
    assignedAt: asDate(doc.assignedAt),
    project: projectId ? projects.get(projectId) ?? null : null,
  };
}

export async function listEmployees(filters: {
  q?: string | null;
  status?: string | null;
  role?: string | null;
  projectId?: string | null;
}) {
  const [employeeDocs, assignmentDocs, projectDocs] = await Promise.all([
    readCollection("Employee"),
    readCollection("ProjectAssignment"),
    readCollection("Project"),
  ]);
  const projects = projectsById(projectDocs);
  const assignments = new Map<string, NonNullable<ReturnType<typeof mapAssignment>>[]>();
  for (const doc of assignmentDocs) {
    const row = mapAssignment(doc, projects);
    if (!row) continue;
    const rows = assignments.get(row.employeeId) ?? [];
    rows.push(row);
    assignments.set(row.employeeId, rows);
  }

  const q = filters.q?.trim().toLowerCase() ?? "";
  return employeeDocs
    .map(mapEmployee)
    .filter(present)
    .map((employee) => ({
      ...employee,
      assignments: (assignments.get(employee.id) ?? []).sort((a, b) => b.assignedAt.getTime() - a.assignedAt.getTime()),
    }))
    .filter((employee) => {
      if (filters.status && employee.status !== filters.status) return false;
      if (filters.role && employee.role !== filters.role) return false;
      if (filters.projectId && !employee.assignments.some((row) => row.projectId === filters.projectId)) return false;
      if (!q) return true;
      return [employee.name, employee.email, employee.employeeCode, employee.phone, employee.designation].some((value) =>
        String(value ?? "").toLowerCase().includes(q),
      );
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((employee) => serializeEmployee(employee));
}

export async function getEmployeeDetail(id: string) {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  const oid = { $oid: id };
  const [employeeDocs, assignmentDocs, projectDocs, attendanceDocs, reportDocs] = await Promise.all([
    readCollection("Employee", { _id: oid }, undefined, 1),
    readCollection("ProjectAssignment", { employeeId: oid }),
    readCollection("Project"),
    readCollection("Attendance", { employeeId: oid }, { date: -1 }, 14),
    readCollection("DailyReport", { employeeId: oid }, { date: -1 }, 14),
  ]);
  const employee = employeeDocs.map(mapEmployee).find(Boolean);
  if (!employee) return null;
  const projects = projectsById(projectDocs);

  const attendance = attendanceDocs
    .map((doc) => {
      const rowId = objectId(doc._id);
      if (!rowId) return null;
      const projectId = objectId(doc.projectId);
      return {
        id: rowId,
        employeeId: objectId(doc.employeeId),
        projectId: projectId || null,
        date: text(doc.date),
        checkInAt: asDate(doc.checkInAt),
        checkOutAt: doc.checkOutAt == null ? null : asDate(doc.checkOutAt),
        createdAt: asDate(doc.createdAt),
        project: projectId ? projects.get(projectId) ?? null : null,
      };
    })
    .filter(present)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);

  const reports = reportDocs
    .map((doc) => {
      const rowId = objectId(doc._id);
      if (!rowId) return null;
      const projectId = objectId(doc.projectId);
      return {
        id: rowId,
        employeeId: objectId(doc.employeeId),
        projectId,
        date: text(doc.date),
        summary: text(doc.summary),
        details: text(doc.details),
        createdAt: asDate(doc.createdAt),
        updatedAt: asDate(doc.updatedAt ?? doc.createdAt),
        project: projectId ? projects.get(projectId) ?? null : null,
      };
    })
    .filter(present)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);

  return serializeEmployee({
    ...employee,
    assignments: assignmentDocs
      .map((doc) => mapAssignment(doc, projects))
      .filter(present)
      .sort((a, b) => b.assignedAt.getTime() - a.assignedAt.getTime()),
    attendance,
    reports,
  });
}
