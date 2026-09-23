export function contains(q: string) {
  return { contains: q, mode: "insensitive" as const };
}
