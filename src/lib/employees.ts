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
  },
>(employee: T) {
  const { passwordHash: _passwordHash, ...rest } = employee;
  void _passwordHash;
  return {
    ...rest,
    role: rest.role === "SUPERVISOR" ? "SUPERVISOR" : "STAFF",
  };
}
