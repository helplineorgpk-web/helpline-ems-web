import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { isObjectId } from "@/lib/object-id";

const schema = z.object({
  projectIds: z.array(z.string().refine(isObjectId)).min(1),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Employee not found", 404);
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return jsonError("Employee not found", 404);

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Select at least one project");

  const projectIds = [...new Set(parsed.data.projectIds)];
  const found = await prisma.project.count({ where: { id: { in: projectIds } } });
  if (found !== projectIds.length) return jsonError("One or more projects no longer exist", 404);

  await Promise.all(
    projectIds.map((projectId) =>
      prisma.projectAssignment.upsert({
        where: { employeeId_projectId: { employeeId: id, projectId } },
        update: {},
        create: { employeeId: id, projectId },
      })
    )
  );

  const assignments = await prisma.projectAssignment.findMany({
    where: { employeeId: id },
    include: { project: true },
  });

  return jsonOk({ assignments });
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
