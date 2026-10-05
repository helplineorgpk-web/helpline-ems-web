import { NextResponse } from "next/server";
import { getDatabaseUrl, hasJwtSecret } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const jwt = hasJwtSecret();
  let database = false;
  let db: "ok" | "fail" | "missing" = "missing";
  let error: string | undefined;

  try {
    const url = getDatabaseUrl();
    database = Boolean(url);
    if (!url) {
      db = "missing";
    } else {
      await prisma.admin.count();
      db = "ok";
    }
  } catch (err) {
    db = "fail";
    error = err instanceof Error ? err.message.replace(/\/\/[^@\s]+@/g, "//***@") : "database error";
  }

  return NextResponse.json({ jwt, database, db, error });
}
