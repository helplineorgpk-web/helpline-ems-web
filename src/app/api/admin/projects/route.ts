import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/lib/http";
import { assertProjectType } from "@/lib/project-types";
import { contains } from "@/lib/search";

const createSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(20),
  type: z.string().min(1),
  location: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const type = searchParams.get("type");
  const status = searchParams.get("status");

  const projects = await prisma.project.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: contains(q) },
              { code: contains(q) },
              { location: contains(q) },
            ],
          }
        : {}),
    },
    include: {
      _count: { select: { assignments: true, reports: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({ projects });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid project data");

  const exists = await prisma.project.findUnique({
    where: { code: parsed.data.code.toUpperCase().trim() },
  });
  if (exists) return jsonError("Project code already exists");

  try {
    await assertProjectType(parsed.data.type);
  } catch {
    return jsonError("Unknown project type");
  }

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name.trim(),
      code: parsed.data.code.toUpperCase().trim(),
      type: parsed.data.type,
      location: parsed.data.location?.trim() || null,
      description: parsed.data.description?.trim() || null,
      status: parsed.data.status ?? "ACTIVE",
    },
  });

  return jsonOk({ project }, 201);
}
