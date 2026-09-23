import { prisma } from "@/lib/prisma";
import { jsonOk } from "@/lib/http";

export async function GET() {
  const endpoints = await prisma.apiEndpoint.findMany({
    orderBy: [{ group: "asc" }, { sortOrder: "asc" }],
  });
  return jsonOk({ endpoints });
}
