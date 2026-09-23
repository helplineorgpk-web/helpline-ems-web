import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { assertProjectType } from "@/lib/project-types";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).max(20).optional(),
  type: z.string().min(1).optional(),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      assignments: {
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
        orderBy: { assignedAt: "desc" },
      },
      _count: { select: { reports: true, attendance: true } },
    },
  });
  if (!project) return jsonError("Project not found", 404);
  return jsonOk({ project });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid project data");

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return jsonError("Project not found", 404);

  if (parsed.data.code) {
    const clash = await prisma.project.findFirst({
      where: { code: parsed.data.code.toUpperCase().trim(), NOT: { id } },
    });
    if (clash) return jsonError("Project code already exists");
  }

  if (parsed.data.type) {
    try {
      await assertProjectType(parsed.data.type);
    } catch {
      return jsonError("Unknown project type");
    }
  }

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...parsed.data,
      code: parsed.data.code ? parsed.data.code.toUpperCase().trim() : undefined,
      name: parsed.data.name?.trim(),
      location: parsed.data.location === undefined ? undefined : parsed.data.location?.trim() || null,
      description:
        parsed.data.description === undefined ? undefined : parsed.data.description?.trim() || null,
    },
  });

  return jsonOk({ project });
}

export async function PUT(request: Request, ctx: Params) {
  return PATCH(request, ctx);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return jsonError("Project not found", 404);
  await prisma.project.delete({ where: { id } });
  return jsonOk({ ok: true });
}
