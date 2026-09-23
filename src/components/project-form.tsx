"use client";

import { useState } from "react";
import { ErrorText, Field } from "@/components/ui";
import { useProjectTypes } from "@/components/project-types";
import { PROJECT_STATUSES } from "@/lib/constants";

export type ProjectFormValues = {
  name: string;
  code: string;
  type: string;
  location: string;
  description: string;
  status: string;
};

export const emptyProjectForm = (): ProjectFormValues => ({
  name: "",
  code: "",
  type: "",
  location: "",
  description: "",
  status: "ACTIVE",
});

export function ProjectForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<ProjectFormValues>;
  submitLabel: string;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
  onCancel?: () => void;
}) {
  const { types, loading: typesLoading } = useProjectTypes();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ProjectFormValues>({
    ...emptyProjectForm(),
    ...initial,
    type: initial?.type || "",
  });

  const selectedType = form.type || types[0]?.slug || "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit({ ...form, type: selectedType });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save project");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <ErrorText message={error} />
      <Field label="Project name">
        <input
          className="input"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code">
          <input
            className="input"
            required
            placeholder="SCH-003"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
        </Field>
        <Field label="Type">
          <select
            className="select"
            required
            disabled={typesLoading || types.length === 0}
            value={selectedType}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {types.length === 0 ? <option value="">Create a type first</option> : null}
            {types.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location">
          <input
            className="input"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </Field>
        <Field label="Status">
          <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {PROJECT_STATUSES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Description">
        <textarea
          className="textarea"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={loading || types.length === 0} type="submit">
          {loading ? "Saving…" : submitLabel}
        </button>
        {onCancel ? (
          <button className="btn btn-ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
