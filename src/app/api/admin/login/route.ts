import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setAdminCookie, signAdminToken, verifyPassword } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/http";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
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
  await setAdminCookie(token);

  return jsonOk({
    admin: { id: admin.id, name: admin.name, email: admin.email },
  });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
