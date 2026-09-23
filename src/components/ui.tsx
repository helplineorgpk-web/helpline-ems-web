"use client";

import { cx } from "@/lib/client";
import { typeBadgeClass } from "@/lib/project-types";
import { useProjectType } from "@/components/project-types";

export function TypeBadge({ type }: { type: string }) {
  const match = useProjectType(type);
  const label = match?.name || type.replaceAll("_", " ");
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide",
        typeBadgeClass(match?.color)
      )}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const on = status === "ACTIVE" || status === "PRESENT" || status === "CHECKED_OUT";
  const warn = status === "ON_DUTY";
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold",
        on && "bg-leaf-soft text-leaf-dark",
        warn && "bg-gold-soft text-amber-800",
        !on && !warn && "bg-stone-100 text-stone-600"
      )}
    >
      <span
        className={cx(
          "h-1.5 w-1.5 rounded-full",
          on && "bg-leaf",
          warn && "bg-gold",
          !on && !warn && "bg-stone-400"
        )}
      />
      {status.replaceAll("_", " ")}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-leaf">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-6 py-14 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {hint ? <p className="mt-1 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

export function ErrorText({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm font-medium text-danger">{message}</p>
  );
}
