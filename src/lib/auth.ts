import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";
import { verifyPassword } from "./password";

export { hashPassword, verifyPassword } from "./password";

const ADMIN_COOKIE = "admin_token";
const JWT_EXPIRES = "7d";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type AdminToken = {
  sub: string;
  email: string;
  name: string;
  role: "admin";
};

export type EmployeeToken = {
  sub: string;
  email: string;
  name: string;
  role: "employee";
  appRole: "STAFF" | "SUPERVISOR";
};

export async function signAdminToken(payload: Omit<AdminToken, "role">) {
  return new SignJWT({ ...payload, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setExpirationTime(JWT_EXPIRES)
    .sign(getSecret());
}

export async function signEmployeeToken(payload: Omit<EmployeeToken, "role">) {
  return new SignJWT({ ...payload, role: "employee" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifyToken<T extends AdminToken | EmployeeToken>(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as T;
}

export async function setAdminCookie(token: string) {
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminCookie() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}

export async function getAdminSession(): Promise<AdminToken | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  try {
    const payload = await verifyToken<AdminToken>(token);
    if (payload.role !== "admin") return null;
    const admin = await prisma.admin.findUnique({ where: { id: payload.sub } });
    if (!admin) return null;
    return {
      sub: admin.id,
      email: admin.email,
      name: admin.name,
      role: "admin",
    };
  } catch {
    return null;
  }
}

export async function getEmployeeFromAuthHeader(request: Request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;
  try {
    const payload = await verifyToken<EmployeeToken>(token);
    if (payload.role !== "employee") return null;
    const employee = await prisma.employee.findUnique({
      where: { id: payload.sub },
      include: {
        assignments: { include: { project: true } },
      },
    });
    if (!employee || employee.status !== "ACTIVE") return null;
    return employee;
  } catch {
    return null;
  }
}

export function publicEmployee(employee: {
  id: string;
  employeeCode: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string;
  role?: string | null;
  status: string;
}) {
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    name: employee.name,
    email: employee.email,
    phone: employee.phone,
    designation: employee.designation,
    role: employee.role === "SUPERVISOR" ? "SUPERVISOR" : "STAFF",
    status: employee.status,
  };
}
