import { prisma } from "@/lib/prisma";

type MongoDoc = Record<string, unknown>;

type MongoCursor = {
  cursor?: {
    firstBatch?: MongoDoc[];
  };
};

const PAGE_SIZE = 1000;
const MAX_PAGES = 50;

async function findPage(name: string, filter: MongoDoc, sort: MongoDoc, skip: number, limit: number) {
  const result = (await prisma.$runCommandRaw({
    find: name,
    filter,
    sort,
    skip,
    limit,
    batchSize: limit,
    singleBatch: true,
  } as never)) as MongoCursor;
  return result.cursor?.firstBatch ?? [];
}

// Pages with skip/limit in single batches instead of getMore: $runCommandRaw returns the
// 64-bit cursor id as a JS number, which loses precision and fails with CursorNotFound.
export async function readCollection(
  name: string,
  filter: MongoDoc = {},
  sort?: MongoDoc,
  limit?: number,
) {
  const order = sort ?? { _id: 1 };
  if (limit) return findPage(name, filter, order, 0, limit);

  const docs: MongoDoc[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const batch = await findPage(name, filter, order, page * PAGE_SIZE, PAGE_SIZE);
    docs.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return docs;
}

export function objectId(value: unknown) {
  if (typeof value === "string" && /^[a-f0-9]{24}$/i.test(value)) return value;
  if (value && typeof value === "object" && "$oid" in value) {
    const id = (value as { $oid: unknown }).$oid;
    return typeof id === "string" ? id : "";
  }
  return "";
}

export function text(value: unknown, fallback = "") {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

export function optionalText(value: unknown) {
  if (value == null) return null;
  const parsed = text(value).trim();
  return parsed || null;
}

export function asDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  if (value && typeof value === "object" && "$date" in value) {
    const raw = (value as { $date: unknown }).$date;
    if (typeof raw === "string" || typeof raw === "number") {
      const date = new Date(raw);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }
  return new Date(0);
}
