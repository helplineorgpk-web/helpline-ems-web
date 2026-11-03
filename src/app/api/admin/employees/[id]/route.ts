import { z } from "zod";
import { getAdminSession, hashPassword } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";
import { deleteEmployeeAccount, isFailure } from "@/lib/account-deletions";
import { getEmployeeDetail, updateEmployee } from "@/lib/employees";
import { normalizePhone, phoneSchema } from "@/lib/phone";
import { isObjectId } from "@/lib/object-id";
import { closeOverdueAttendance } from "@/lib/attendance";

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

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Employee not found", 404);
  const query = new URL(request.url).searchParams;
  try {
    // This page reads raw documents to survive bad data; a failed auto check-out must not hide it.
    await closeOverdueAttendance(id).catch((error) =>
      console.error("Auto check-out before employee detail failed", error instanceof Error ? error.message : error)
    );
    const employee = await getEmployeeDetail(id, {
      attendancePage: Number(query.get("attendancePage")) || 1,
      reportsPage: Number(query.get("reportsPage")) || 1,
    });
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
  const session = await getAdminSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (!session.canDeleteAccounts) {
    return jsonError("Only authorized administrators can permanently delete accounts", 403);
  }

  const { id } = await params;
  try {
    const result = await deleteEmployeeAccount(id, {
      id: session.sub,
      name: session.name,
      canDeleteAccounts: true,
    });
    if (isFailure(result)) return jsonError(result.error, result.status);
    return jsonOk(result);
  } catch (error) {
    console.error("DELETE /api/admin/employees/[id] failed", error instanceof Error ? error.message : error);
    return jsonError("Could not delete employee", 500);
  }
}
