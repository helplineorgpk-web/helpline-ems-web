import { prisma } from "@/lib/prisma";

type MongoDoc = Record<string, unknown>;

type MongoCursor = {
  cursor?: {
    firstBatch?: MongoDoc[];
    nextBatch?: MongoDoc[];
    id?: unknown;
  };
};

function cursorDone(id: unknown) {
  if (id == null) return true;
  if (typeof id === "number") return id === 0;
  if (typeof id === "string") return id === "0";
  if (typeof id === "object" && "$numberLong" in id) {
    return String((id as { $numberLong: unknown }).$numberLong) === "0";
  }
  return false;
}

export async function readCollection(
  name: string,
  filter: MongoDoc = {},
  sort?: MongoDoc,
  limit?: number,
) {
  const docs: MongoDoc[] = [];
  let result = (await prisma.$runCommandRaw({
    find: name,
    filter,
    batchSize: limit ?? 1000,
    ...(sort ? { sort } : {}),
    ...(limit ? { limit } : {}),
  } as never)) as MongoCursor;
  docs.push(...(result.cursor?.firstBatch ?? []));

  let id = result.cursor?.id;
  for (let page = 0; page < 20 && !limit && !cursorDone(id); page += 1) {
    result = (await prisma.$runCommandRaw({
      getMore: id as never,
      collection: name,
      batchSize: 1000,
    })) as MongoCursor;
    docs.push(...(result.cursor?.nextBatch ?? []));
    id = result.cursor?.id;
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
