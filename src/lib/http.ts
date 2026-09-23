import { NextResponse } from "next/server";

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function corsJson(data: unknown, status = 200) {
  const res = NextResponse.json(data, { status });
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  return res;
}

export function corsError(message: string, status = 400) {
  return corsJson({ error: message }, status);
}

export function corsPreflight() {
  return corsJson({ ok: true });
}
