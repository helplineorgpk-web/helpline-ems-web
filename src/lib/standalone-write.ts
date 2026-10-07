import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

const WRITE_METHODS = new Set(["create", "update", "upsert", "delete", "updateMany", "deleteMany"]);

const OBJECT_ID_FIELDS = new Set(["id", "employeeId", "projectId", "reportId"]);

const UPDATED_AT = new Set(["Employee", "ProjectType", "Project", "DailyReport", "ApiEndpoint"]);

const NESTED_CREATES: Record<string, Record<string, { collection: string; parentField: string }>> = {
  Employee: {
    assignments: { collection: "ProjectAssignment", parentField: "employeeId" },
  },
};

type Delegate = {
  findUnique: (args: Record<string, unknown>) => Promise<unknown>;
};

type WriteArgs = {
  where?: Record<string, unknown>;
  data?: Record<string, unknown>;
  create?: Record<string, unknown>;
  update?: Record<string, unknown>;
  include?: unknown;
  select?: unknown;
};

function isReplicaSetError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code) : "";
  const message = error instanceof Error ? error.message : "";
  return code === "P2031" || message.includes("replica set");
}

function collectionName(model: string) {
  return model.charAt(0).toUpperCase() + model.slice(1);
}

function objectId() {
  return Math.floor(Date.now() / 1000).toString(16).padStart(8, "0") + randomBytes(8).toString("hex");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);
}

function encode(field: string, value: unknown): unknown {
  if (value instanceof Date) return { $date: value.toISOString() };
  if (typeof value === "string" && OBJECT_ID_FIELDS.has(field) && /^[a-f0-9]{24}$/i.test(value)) {
    return { $oid: value };
  }
  return value;
}

function fieldName(field: string) {
  return field === "id" ? "_id" : field;
}

function toQuery(where: Record<string, unknown> = {}) {
  const query: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(where)) {
    if (isPlainObject(value)) {
      for (const [innerKey, innerValue] of Object.entries(value)) {
        query[fieldName(innerKey)] = encode(innerKey, innerValue);
      }
      continue;
    }
    query[fieldName(key)] = encode(key, value);
  }
  return query;
}

function scalarData(data: Record<string, unknown> = {}) {
  const scalar: Record<string, unknown> = {};
  const nested: Array<{ relation: string; rows: Record<string, unknown>[] }> = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (isPlainObject(value) && "create" in value) {
      const create = value.create;
      const rows = Array.isArray(create) ? create : create ? [create] : [];
      nested.push({ relation: key, rows: rows.filter(isPlainObject) });
      continue;
    }
    scalar[fieldName(key)] = encode(key, value);
  }
  return { scalar, nested };
}

async function command(client: PrismaClient, document: Record<string, unknown>) {
  return client.$runCommandRaw(document as never) as Promise<Record<string, unknown>>;
}

async function readBack(delegate: Delegate, where: Record<string, unknown>, args: WriteArgs) {
  return delegate.findUnique({
    where,
    ...(args.include ? { include: args.include } : {}),
    ...(args.select ? { select: args.select } : {}),
  });
}

async function insertOne(client: PrismaClient, collection: string, document: Record<string, unknown>) {
  const id = objectId();
  document._id = { $oid: id };
  await command(client, { insert: collection, documents: [document] });
  return id;
}

export async function standaloneWrite(
  client: PrismaClient,
  model: string,
  method: string,
  args: WriteArgs,
  delegate: Delegate
): Promise<unknown> {
  const collection = collectionName(model);
  const now = { $date: new Date().toISOString() };

  if (method === "upsert") {
    const existing = await delegate.findUnique({ where: args.where || {} });
    if (existing) {
      return standaloneWrite(
        client,
        model,
        "update",
        { where: args.where, data: args.update || {}, include: args.include, select: args.select },
        delegate
      );
    }
    return standaloneWrite(
      client,
      model,
      "create",
      { data: args.create || {}, include: args.include, select: args.select },
      delegate
    );
  }

  if (method === "update" || method === "updateMany") {
    const { scalar } = scalarData(args.data);
    if (UPDATED_AT.has(collection)) scalar.updatedAt = scalar.updatedAt ?? now;
    if (Object.keys(scalar).length === 0) {
      return method === "updateMany" ? { count: 0 } : readBack(delegate, args.where || {}, args);
    }
    const result = await command(client, {
      update: collection,
      updates: [{ q: toQuery(args.where), u: { $set: scalar }, multi: method === "updateMany" }],
    });
    if (method === "updateMany") return { count: Number(result.nModified ?? result.n ?? 0) };
    return readBack(delegate, args.where || {}, args);
  }

  if (method === "delete" || method === "deleteMany") {
    const existing = method === "delete" ? await readBack(delegate, args.where || {}, args) : null;
    const result = await command(client, {
      delete: collection,
      deletes: [{ q: toQuery(args.where), limit: method === "delete" ? 1 : 0 }],
    });
    if (method === "deleteMany") return { count: Number(result.n ?? 0) };
    return existing;
  }

  if (method === "create") {
    const { scalar, nested } = scalarData(args.data);
    const id = await insertOne(client, collection, {
      ...scalar,
      createdAt: scalar.createdAt ?? now,
      ...(UPDATED_AT.has(collection) ? { updatedAt: scalar.updatedAt ?? now } : {}),
    });

    for (const item of nested) {
      const mapped = NESTED_CREATES[model]?.[item.relation];
      if (!mapped) throw new Error(`Cannot save nested ${item.relation} on ${model} without a replica set`);
      for (const row of item.rows) {
        const { scalar: child } = scalarData(row);
        await insertOne(client, mapped.collection, {
          ...child,
          [mapped.parentField]: { $oid: id },
          ...(mapped.collection === "ProjectAssignment" ? { assignedAt: child.assignedAt ?? now } : {}),
          createdAt: child.createdAt ?? now,
        });
      }
    }

    return readBack(delegate, { id }, args);
  }

  throw new Error(`Unsupported standalone write: ${method}`);
}

export function wrapDelegate<T extends Delegate & Record<string, unknown>>(
  client: PrismaClient,
  model: string,
  delegate: T
): T {
  return new Proxy(delegate, {
    get(target, method, receiver) {
      const value = Reflect.get(target, method, receiver);
      if (typeof method !== "string" || typeof value !== "function" || !WRITE_METHODS.has(method)) {
        return typeof value === "function" ? value.bind(target) : value;
      }
      return async (args: WriteArgs) => {
        try {
          return await value.call(target, args);
        } catch (error) {
          if (!isReplicaSetError(error)) throw error;
          return standaloneWrite(client, model, method, args ?? {}, target);
        }
      };
    },
  }) as T;
}
