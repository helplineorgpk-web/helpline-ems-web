import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { assignEmployeeProjects } from "@/lib/employees";
import { isObjectId } from "@/lib/object-id";

const schema = z.object({
  projectIds: z.array(z.string().refine(isObjectId)).min(1),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Employee not found", 404);
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Select at least one project");

  try {
    const result = await assignEmployeeProjects(id, parsed.data.projectIds);
    if ("error" in result && result.error === "employee") return jsonError("Employee not found", 404);
    if ("error" in result) return jsonError("One or more projects no longer exist", 404);
    return jsonOk({ assignments: result.assignments });
  } catch (error) {
    console.error("POST /api/admin/employees/[id]/assign failed", error instanceof Error ? error.message : error);
    return jsonError("Could not assign project", 500);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Employee not found", 404);
  const body = await request.json().catch(() => null);
  const projectId = body?.projectId as string | undefined;
  if (!isObjectId(projectId)) return jsonError("projectId is required");

  await prisma.projectAssignment.deleteMany({
    where: { employeeId: id, projectId },
  });

  return jsonOk({ ok: true });
}
