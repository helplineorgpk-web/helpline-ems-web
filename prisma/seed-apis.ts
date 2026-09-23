import { prisma } from "../src/lib/prisma";
import { API_CATALOG } from "../src/lib/api-catalog";

async function main() {
  for (const item of API_CATALOG) {
    await prisma.apiEndpoint.upsert({
      where: { method_path: { method: item.method, path: item.path } },
      update: {
        group: item.group,
        title: item.title,
        auth: item.auth,
        body: "body" in item ? item.body ?? null : null,
        notes: "notes" in item ? item.notes ?? null : null,
        sortOrder: item.sortOrder,
      },
      create: {
        group: item.group,
        method: item.method,
        path: item.path,
        title: item.title,
        auth: item.auth,
        body: "body" in item ? item.body ?? null : null,
        notes: "notes" in item ? item.notes ?? null : null,
        sortOrder: item.sortOrder,
      },
    });
  }
  console.log(`Upserted ${API_CATALOG.length} API endpoints into MongoDB`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
