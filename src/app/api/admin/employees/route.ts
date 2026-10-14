import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { listEmployees, nextEmployeeCode, serializeEmployee } from "@/lib/employees";
import { normalizePhone, phoneSchema } from "@/lib/phone";
import { isObjectId } from "@/lib/object-id";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: phoneSchema,
  designation: z.string().min(2),
  role: z.enum(["STAFF", "SUPERVISOR"]).optional(),
  password: z.string().min(6),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  projectIds: z.array(z.string().refine(isObjectId)).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (projectId && !isObjectId(projectId)) return jsonError("Invalid project");

  try {
    const employees = await listEmployees({
      q: searchParams.get("q"),
      status: searchParams.get("status"),
      role: searchParams.get("role"),
      projectId,
    });
    return jsonOk({ employees });
  } catch (error) {
    console.error("GET /api/admin/employees failed", error instanceof Error ? error.message : error);
    return jsonError("Could not load employees", 500);
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid employee data");

  const email = parsed.data.email.toLowerCase().trim();
  const exists = await prisma.employee.findUnique({ where: { email } });
  if (exists) return jsonError("An employee with this email already exists");

  const projectIds = [...new Set(parsed.data.projectIds ?? [])];
  if (projectIds.length) {
    const found = await prisma.project.count({ where: { id: { in: projectIds } } });
    if (found !== projectIds.length) return jsonError("One or more projects no longer exist");
  }

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
      assignments: projectIds.length
        ? {
            create: projectIds.map((projectId) => ({ projectId })),
          }
        : undefined,
    },
    include: { assignments: { include: { project: true } } },
  });

  return jsonOk({ employee: serializeEmployee(employee) }, 201);
}
