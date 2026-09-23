export const PROJECT_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

export const EMPLOYEE_STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
] as const;

export const APP_ROLES = [
  { value: "STAFF", label: "Staff" },
  { value: "SUPERVISOR", label: "Supervisor" },
] as const;

export type AppRole = (typeof APP_ROLES)[number]["value"];

export function normalizeAppRole(role?: string | null): AppRole {
  return role === "SUPERVISOR" ? "SUPERVISOR" : "STAFF";
}

export function appRoleLabel(role?: string | null) {
  return APP_ROLES.find((item) => item.value === normalizeAppRole(role))?.label || "Staff";
}

export const TZ = "Asia/Karachi";
