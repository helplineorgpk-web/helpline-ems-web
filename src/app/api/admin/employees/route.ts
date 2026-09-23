import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { nextEmployeeCode, serializeEmployee } from "@/lib/employees";
import { normalizePhone, phoneSchema } from "@/lib/phone";
import { contains } from "@/lib/search";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: phoneSchema,
  designation: z.string().min(2),
  role: z.enum(["STAFF", "SUPERVISOR"]).optional(),
  password: z.string().min(6),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  projectIds: z.array(z.string()).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const status = searchParams.get("status");
  const role = searchParams.get("role");
  const projectId = searchParams.get("projectId");

  const employees = await prisma.employee.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(role ? { role } : {}),
      ...(projectId ? { assignments: { some: { projectId } } } : {}),
      ...(q
        ? {
            OR: [
              { name: contains(q) },
              { email: contains(q) },
              { employeeCode: contains(q) },
              { phone: contains(q) },
              { designation: contains(q) },
            ],
          }
        : {}),
    },
    include: {
      assignments: { include: { project: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({
    employees: employees.map((e) => serializeEmployee(e)),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid employee data");

  const email = parsed.data.email.toLowerCase().trim();
  const exists = await prisma.employee.findUnique({ where: { email } });
  if (exists) return jsonError("An employee with this email already exists");

  const employee = await prisma.employee.create({
    data: {
      employeeCode: await nextEmployeeCode(),
      name: parsed.data.name.trim(),
      email,
      phone: normalizePhone(parsed.data.phone),
      designation: parsed.data.designation.trim(),
      role: parsed.data.role ?? "STAFF",
      passwordHash: await hashPassword(parsed.data.password),
      status: parsed.data.status ?? "ACTIVE",
      assignments: parsed.data.projectIds?.length
        ? {
            create: parsed.data.projectIds.map((projectId) => ({ projectId })),
          }
        : undefined,
    },
    include: { assignments: { include: { project: true } } },
  });

  return jsonOk({ employee: serializeEmployee(employee) }, 201);
}
