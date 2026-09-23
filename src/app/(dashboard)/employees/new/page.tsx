"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { ErrorText, Field, PageHeader } from "@/components/ui";
import { APP_ROLES } from "@/lib/constants";

type Project = { id: string; name: string; type: string; status: string };

export default function NewEmployeePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    designation: "",
    role: "STAFF",
    password: "Emp@123",
    projectIds: [] as string[],
  });

  useEffect(() => {
    api<{ projects: Project[] }>("/api/admin/projects").then((d) =>
      setProjects(d.projects.filter((p) => p.status === "ACTIVE"))
    );
  }, []);

  function toggleProject(id: string) {
    setForm((prev) => ({
      ...prev,
      projectIds: prev.projectIds.includes(id)
        ? prev.projectIds.filter((x) => x !== id)
        : [...prev.projectIds, id],
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ employee: { id: string } }>("/api/admin/employees", {
        method: "POST",
        body: JSON.stringify(form),
      });
      router.push(`/employees/${res.employee.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create employee");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Employees"
        title="Add employee"
        description="Choose a role: Staff submit daily reports. Supervisors also see their project's team in the app."
      />
      <form className="card space-y-4 p-6" onSubmit={onSubmit}>
        <ErrorText message={error} />
        <Field label="Full name">
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email (app login)">
            <input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Contact number">
            <input
              className="input"
              required
              type="tel"
              inputMode="tel"
              placeholder="0300 1234567"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Designation">
            <input
              className="input"
              placeholder="Teacher, Imam, Coordinator…"
              required
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
            />
          </Field>
          <Field label="App role">
            <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {APP_ROLES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="App password">
          <input className="input" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Assign to projects</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {projects.map((project) => (
              <label key={project.id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.projectIds.includes(project.id)}
                  onChange={() => toggleProject(project.id)}
                />
                {project.name}
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-primary" disabled={loading} type="submit">
            {loading ? "Saving…" : "Save employee"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => router.back()}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
