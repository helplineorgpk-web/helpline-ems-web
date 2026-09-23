import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { slugifyType } from "@/lib/project-types";

const COLOR_ENUM = ["sky", "leaf", "amber", "rose", "teal", "violet", "orange", "stone"] as const;

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  slug: z.string().min(2).max(24).optional(),
  color: z.enum(COLOR_ENUM).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid type data");

  const existing = await prisma.projectType.findUnique({ where: { id } });
  if (!existing) return jsonError("Type not found", 404);

  const nextSlug = parsed.data.slug ? slugifyType(parsed.data.slug) : existing.slug;
  if (nextSlug !== existing.slug) {
    const clash = await prisma.projectType.findFirst({
      where: { slug: nextSlug, NOT: { id } },
    });
    if (clash) return jsonError("A type with this code already exists");
  }

  const type = await prisma.$transaction(async (tx) => {
    const updated = await tx.projectType.update({
      where: { id },
      data: {
        name: parsed.data.name?.trim(),
        slug: nextSlug,
        color: parsed.data.color,
      },
    });

    if (nextSlug !== existing.slug) {
      await tx.project.updateMany({
        where: { type: existing.slug },
        data: { type: nextSlug },
      });
    }

    return updated;
  });

  return jsonOk({ type });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.projectType.findUnique({ where: { id } });
  if (!existing) return jsonError("Type not found", 404);

  const used = await prisma.project.count({ where: { type: existing.slug } });
  if (used > 0) {
    return jsonError("This type is used by projects. Reassign those projects first.");
  }

  await prisma.projectType.delete({ where: { id } });
  return jsonOk({ ok: true });
}
