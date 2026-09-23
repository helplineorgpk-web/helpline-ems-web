import { getEmployeeFromAuthHeader } from "@/lib/auth";
import { corsError, corsJson, corsPreflight } from "@/lib/http";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(request: Request) {
  const employee = await getEmployeeFromAuthHeader(request);
  if (!employee) return corsError("Unauthorized", 401);

  return corsJson({
    projects: employee.assignments
      .map((a) => a.project)
      .filter((p) => p.status === "ACTIVE"),
  });
}
