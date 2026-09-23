import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { listProjectTypes, slugifyType } from "@/lib/project-types";

const COLOR_ENUM = ["sky", "leaf", "amber", "rose", "teal", "violet", "orange", "stone"] as const;

const createSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(24).optional(),
  color: z.enum(COLOR_ENUM).optional(),
});

export async function GET() {
  const types = await listProjectTypes();
  const counts = await prisma.project.groupBy({
    by: ["type"],
    _count: { type: true },
  });
  const countMap = Object.fromEntries(counts.map((c) => [c.type, c._count.type]));

  return jsonOk({
    types: types.map((type) => ({
      ...type,
      projectCount: countMap[type.slug] || 0,
    })),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid type data");

  const name = parsed.data.name.trim();
  const slug = slugifyType(parsed.data.slug || name);
  const exists = await prisma.projectType.findUnique({ where: { slug } });
  if (exists) return jsonError("A type with this code already exists");

  const last = await prisma.projectType.findFirst({
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const type = await prisma.projectType.create({
    data: {
      name,
      slug,
      color: parsed.data.color || "stone",
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  return jsonOk({ type }, 201);
}
