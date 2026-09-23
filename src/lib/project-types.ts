import { prisma } from "./prisma";

export const TYPE_COLORS = [
  { value: "sky", label: "Blue" },
  { value: "leaf", label: "Green" },
  { value: "amber", label: "Amber" },
  { value: "rose", label: "Rose" },
  { value: "teal", label: "Teal" },
  { value: "violet", label: "Violet" },
  { value: "orange", label: "Orange" },
  { value: "stone", label: "Gray" },
] as const;

export type TypeColor = (typeof TYPE_COLORS)[number]["value"];

export const TYPE_COLOR_CLASSES: Record<string, string> = {
  sky: "bg-sky-50 text-sky-800 border-sky-200",
  leaf: "bg-leaf-soft text-leaf-dark border-emerald-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  rose: "bg-rose-50 text-rose-800 border-rose-200",
  teal: "bg-teal-50 text-teal-800 border-teal-200",
  violet: "bg-violet-50 text-violet-800 border-violet-200",
  orange: "bg-orange-50 text-orange-800 border-orange-200",
  stone: "bg-stone-100 text-stone-700 border-stone-200",
};

export const DEFAULT_PROJECT_TYPES = [
  { name: "School", slug: "SCHOOL", color: "sky", sortOrder: 1 },
  { name: "Masjid", slug: "MASJID", color: "leaf", sortOrder: 2 },
  { name: "Vocational Training Center", slug: "VTC", color: "amber", sortOrder: 3 },
  { name: "Orphan Care", slug: "ORPHAN", color: "rose", sortOrder: 4 },
  { name: "Welfare / Relief", slug: "WELFARE", color: "teal", sortOrder: 5 },
  { name: "Other", slug: "OTHER", color: "stone", sortOrder: 6 },
];

export function slugifyType(name: string) {
  const slug = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return slug || "TYPE";
}

export function typeBadgeClass(color?: string | null) {
  return TYPE_COLOR_CLASSES[color || ""] || TYPE_COLOR_CLASSES.stone;
}

export async function ensureProjectTypes() {
  const existing = await prisma.projectType.findMany();
  const slugs = new Set(existing.map((item) => item.slug));

  for (const item of DEFAULT_PROJECT_TYPES) {
    if (!slugs.has(item.slug)) {
      await prisma.projectType.create({ data: item });
      slugs.add(item.slug);
    }
  }

  const used = await prisma.project.findMany({
    select: { type: true },
  });
  const usedTypes = [...new Set(used.map((row) => row.type))];

  let extraOrder = 100;
  for (const type of usedTypes) {
    if (!type || slugs.has(type)) continue;
    await prisma.projectType.create({
      data: {
        name: type.replaceAll("_", " "),
        slug: type,
        color: "stone",
        sortOrder: extraOrder,
      },
    });
    slugs.add(type);
    extraOrder += 1;
  }
}

export async function listProjectTypes() {
  await ensureProjectTypes();
  return prisma.projectType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function assertProjectType(slug: string) {
  const type = await prisma.projectType.findUnique({ where: { slug } });
  if (!type) throw new Error("Unknown project type");
  return type;
}
