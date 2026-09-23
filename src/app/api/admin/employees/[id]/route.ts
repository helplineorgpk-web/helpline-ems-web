import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { serializeEmployee } from "@/lib/employees";
import { normalizePhone, phoneSchema } from "@/lib/phone";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: phoneSchema.optional().nullable(),
  designation: z.string().min(2).optional(),
  role: z.enum(["STAFF", "SUPERVISOR"]).optional(),
  password: z.string().min(6).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      assignments: { include: { project: true }, orderBy: { assignedAt: "desc" } },
      attendance: {
        take: 14,
        orderBy: { date: "desc" },
        include: { project: true },
      },
      reports: {
        take: 14,
        orderBy: { date: "desc" },
        include: { project: true },
      },
    },
  });
  if (!employee) return jsonError("Employee not found", 404);
  return jsonOk({ employee: serializeEmployee(employee) });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid employee data");

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) return jsonError("Employee not found", 404);

  if (parsed.data.email) {
    const email = parsed.data.email.toLowerCase().trim();
    const clash = await prisma.employee.findFirst({
      where: { email, NOT: { id } },
    });
    if (clash) return jsonError("An employee with this email already exists");
  }

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      name: parsed.data.name?.trim(),
      email: parsed.data.email?.toLowerCase().trim(),
      phone: parsed.data.phone === undefined ? undefined : parsed.data.phone ? normalizePhone(parsed.data.phone) : null,
      designation: parsed.data.designation?.trim(),
      role: parsed.data.role,
      status: parsed.data.status,
      passwordHash: parsed.data.password ? await hashPassword(parsed.data.password) : undefined,
    },
    include: { assignments: { include: { project: true } } },
  });

  return jsonOk({ employee: serializeEmployee(employee) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await prisma.employee.delete({ where: { id } }).catch(() => null);
  return jsonOk({ ok: true });
}
