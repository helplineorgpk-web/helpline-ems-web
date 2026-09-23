import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";

const schema = z.object({
  employeeIds: z.array(z.string()).min(1),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return jsonError("Project not found", 404);

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Select at least one employee");

  await Promise.all(
    parsed.data.employeeIds.map((employeeId) =>
      prisma.projectAssignment.upsert({
        where: { employeeId_projectId: { employeeId, projectId: id } },
        update: {},
        create: { employeeId, projectId: id },
      })
    )
  );

  const assignments = await prisma.projectAssignment.findMany({
    where: { projectId: id },
    include: { employee: true },
  });

  return jsonOk({ assignments });
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const employeeId = body?.employeeId as string | undefined;
  if (!employeeId) return jsonError("employeeId is required");

  await prisma.projectAssignment.deleteMany({
    where: { projectId: id, employeeId },
  });

  return jsonOk({ ok: true });
}
