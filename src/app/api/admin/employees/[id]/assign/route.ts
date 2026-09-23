import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";

const schema = z.object({
  projectIds: z.array(z.string()).min(1),
});

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return jsonError("Employee not found", 404);

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Select at least one project");

  await Promise.all(
    parsed.data.projectIds.map((projectId) =>
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
  const body = await request.json().catch(() => null);
  const projectId = body?.projectId as string | undefined;
  if (!projectId) return jsonError("projectId is required");

  await prisma.projectAssignment.deleteMany({
    where: { employeeId: id, projectId },
  });

  return jsonOk({ ok: true });
}
