import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signAdminToken, verifyPassword } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function publicLoginError(err: unknown) {
  const msg = err instanceof Error ? err.message : "Login failed";
  if (/JWT_SECRET/i.test(msg)) {
    return "Server is missing JWT_SECRET. Add it in Vercel environment variables.";
  }
  if (/localhost|127\.0\.0\.1/i.test(msg)) {
    return "Database URL on Vercel points to localhost. Set DATABASE_URL to MongoDB Atlas.";
  }
  if (/Environment variable not found: DATABASE_URL|DATABASE_URL is not set/i.test(msg)) {
    return "DATABASE_URL is not set on Vercel.";
  }
  if (/Server selection|ReplicaSetNoPrimary|querySrv|ENOTFOUND|ETIMEDOUT|MongoServerSelection|Can't reach|TLS|authentication failed/i.test(msg)) {
    return "Cannot reach MongoDB Atlas from Vercel. Allow 0.0.0.0/0 in Atlas Network Access and set DATABASE_URL.";
  }
  return "Login failed on the server. Check Vercel logs.";
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Email and password are required");

    const admin = await prisma.admin.findUnique({
      where: { email: parsed.data.email.toLowerCase().trim() },
    });
    if (!admin) return jsonError("Invalid email or password", 401);

    const ok = await verifyPassword(parsed.data.password, admin.passwordHash);
    if (!ok) return jsonError("Invalid email or password", 401);

    const token = await signAdminToken({
      sub: admin.id,
      email: admin.email,
      name: admin.name,
    });

    const res = NextResponse.json({
      admin: { id: admin.id, name: admin.name, email: admin.email },
    });
    res.cookies.set("admin_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (err) {
    console.error("admin login failed", err);
    return jsonError(publicLoginError(err), 500);
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
