import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicEmployee, signEmployeeToken, verifyPassword } from "@/lib/auth";
import { corsError, corsJson, corsPreflight } from "@/lib/http";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return corsError("Email and password are required");

  const employee = await prisma.employee.findUnique({
    where: { email: parsed.data.email.toLowerCase().trim() },
    include: { assignments: { include: { project: true } } },
  });
  if (!employee) return corsError("Invalid email or password", 401);

  const ok = await verifyPassword(parsed.data.password, employee.passwordHash);
  if (!ok) return corsError("Invalid email or password", 401);
  if (employee.status !== "ACTIVE") return corsError("Account is inactive", 403);

  const token = await signEmployeeToken({
    sub: employee.id,
    email: employee.email,
    name: employee.name,
    appRole: employee.role === "SUPERVISOR" ? "SUPERVISOR" : "STAFF",
  });

  return corsJson({
    token,
    employee: {
      ...publicEmployee(employee),
      projects: employee.assignments.map((a) => a.project),
    },
  });
}
