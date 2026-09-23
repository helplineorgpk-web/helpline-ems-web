import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .min(10, "Enter a valid contact number")
  .max(20)
  .regex(/^[+\d][\d\s-]{8,19}$/, "Enter a valid contact number");

export function normalizePhone(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function telHref(value: string) {
  const digits = value.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : undefined;
}
