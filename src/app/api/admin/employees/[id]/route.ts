import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { getEmployeeDetail, updateEmployee } from "@/lib/employees";
import { normalizePhone, phoneSchema } from "@/lib/phone";
import { isObjectId } from "@/lib/object-id";

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
  if (!isObjectId(id)) return jsonError("Employee not found", 404);
  try {
    const employee = await getEmployeeDetail(id);
    if (!employee) return jsonError("Employee not found", 404);
    return jsonOk({ employee });
  } catch (error) {
    console.error("GET /api/admin/employees/[id] failed", error instanceof Error ? error.message : error);
    return jsonError("Could not load employee", 500);
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Employee not found", 404);
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid employee data");

  try {
    const result = await updateEmployee(id, {
      name: parsed.data.name?.trim(),
      email: parsed.data.email?.toLowerCase().trim(),
      phone: parsed.data.phone === undefined ? undefined : parsed.data.phone ? normalizePhone(parsed.data.phone) : null,
      designation: parsed.data.designation?.trim(),
      role: parsed.data.role,
      status: parsed.data.status,
      passwordHash: parsed.data.password ? await hashPassword(parsed.data.password) : undefined,
    });
    if (!result) return jsonError("Employee not found", 404);
    if ("error" in result) return jsonError("An employee with this email already exists");
    return jsonOk({ employee: result.employee });
  } catch (error) {
    console.error("PATCH /api/admin/employees/[id] failed", error instanceof Error ? error.message : error);
    return jsonError("Could not save employee", 500);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Employee not found", 404);
  await prisma.employee.delete({ where: { id } }).catch(() => null);
  return jsonOk({ ok: true });
}
