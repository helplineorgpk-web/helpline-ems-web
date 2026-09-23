import { getEmployeeFromAuthHeader } from "@/lib/auth";
import { corsError, corsJson, corsPreflight } from "@/lib/http";
import { listProjectTypes } from "@/lib/project-types";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  const employee = await getEmployeeFromAuthHeader(request);
  if (!employee) return corsError("Unauthorized", 401);

  const types = await listProjectTypes();
  return corsJson({ types });
}
