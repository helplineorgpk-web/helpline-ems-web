import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { isObjectId } from "@/lib/object-id";

const schema = z.object({
  employeeIds: z.array(z.string().refine(isObjectId)).min(1),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Project not found", 404);
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return jsonError("Project not found", 404);

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Select at least one employee");

  const employeeIds = [...new Set(parsed.data.employeeIds)];
  const found = await prisma.employee.count({ where: { id: { in: employeeIds } } });
  if (found !== employeeIds.length) return jsonError("One or more employees no longer exist", 404);

  await Promise.all(
    employeeIds.map((employeeId) =>
      prisma.projectAssignment.upsert({
        where: { employeeId_projectId: { employeeId, projectId: id } },
        update: {},
        create: { employeeId, projectId: id },
      })
    )
  );

  const assignments = await prisma.projectAssignment.findMany({
    where: { projectId: id },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          designation: true,
          employeeCode: true,
          status: true,
        },
      },
    },
  });

  return jsonOk({ assignments });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isObjectId(id)) return jsonError("Project not found", 404);
  const body = await request.json().catch(() => null);
  const employeeId = body?.employeeId as string | undefined;
  if (!isObjectId(employeeId)) return jsonError("employeeId is required");

  await prisma.projectAssignment.deleteMany({
    where: { projectId: id, employeeId },
  });

  return jsonOk({ ok: true });
}
