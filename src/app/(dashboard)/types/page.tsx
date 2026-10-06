"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { Dropdown } from "@/components/dropdown";
import { Skeleton } from "@/components/skeleton";
import { ErrorText, Field, PageHeader, TypeBadge } from "@/components/ui";
import { useProjectTypes, type ProjectTypeOption } from "@/components/project-types";
import { TYPE_COLORS } from "@/lib/project-types";
import { CheckIcon, CloseIcon, IconButton, PencilIcon, PlusIcon, TrashIcon } from "@/components/icon-button";

export default function ProjectTypesPage() {
  const { types, loading, reload } = useProjectTypes();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", color: "stone" });
  const [editing, setEditing] = useState<ProjectTypeOption | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api("/api/admin/project-types", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ name: "", color: "stone" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create type");
    } finally {
      setSaving(false);
    }
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/api/admin/project-types/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editing.name, color: editing.color }),
      });
      setEditing(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update type");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(type: ProjectTypeOption) {
    if (!confirm(`Delete type "${type.name}"?`)) return;
    setError(null);
    try {
      await api(`/api/admin/project-types/${type.id}`, { method: "DELETE" });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete type");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Settings"
        title="Project types"
        description="Add, rename, or color-code types such as School, Masjid, VTC, or any new programme Helpline starts."
      />

      <form className="card mb-6 space-y-5 p-6 sm:p-7" onSubmit={onCreate}>
        <ErrorText message={error} />
        <div className="grid gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <Field label="New type name">
            <input
              className="input"
              required
              placeholder="e.g. Water Project"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Color">
            <Dropdown
              value={form.color}
              onChange={(color) => setForm({ ...form, color })}
              options={TYPE_COLORS.map((color) => ({ value: color.value, label: color.label }))}
            />
          </Field>
          <button className="btn btn-primary btn-icon" disabled={saving} type="submit" aria-label="Add type" title="Add type">
            <PlusIcon />
          </button>
        </div>
      </form>

      <div className="card">
        {loading ? (
          <div className="space-y-3 p-6" role="status" aria-label="Loading">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : types.length === 0 ? (
          <p className="p-6 text-muted">No types yet. Add the first one above.</p>
        ) : (
          <div className="divide-y divide-line">
            {types.map((type) => (
              <div key={type.id} className="flex flex-col gap-3 px-6 py-5 transition-colors duration-200 hover:bg-canvas sm:flex-row sm:items-center">
                {editing?.id === type.id ? (
                  <form className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center" onSubmit={onSaveEdit}>
                    <input
                      className="input"
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    />
                    <Dropdown
                      className="sm:w-40"
                      value={editing.color}
                      onChange={(color) => setEditing({ ...editing, color })}
                      options={TYPE_COLORS.map((color) => ({ value: color.value, label: color.label }))}
                    />
                    <div className="flex gap-2">
                      <IconButton disabled={saving} label="Save" tone="primary" type="submit">
                        <CheckIcon />
                      </IconButton>
                      <IconButton label="Cancel" onClick={() => setEditing(null)}>
                        <CloseIcon />
                      </IconButton>
                    </div>
                  </form>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <TypeBadge type={type.slug} />
                        <span className="text-xs font-bold tracking-wide text-muted">{type.slug}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {type.projectCount || 0} project{(type.projectCount || 0) === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <IconButton label="Edit" onClick={() => setEditing(type)}>
                        <PencilIcon />
                      </IconButton>
                      <IconButton label="Delete" onClick={() => onDelete(type)} tone="danger">
                        <TrashIcon />
                      </IconButton>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
