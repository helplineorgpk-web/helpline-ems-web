"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { ErrorText, Field, PageHeader, StatusBadge, TypeBadge } from "@/components/ui";
import { formatDate, formatTime } from "@/lib/datetime";
import { EMPLOYEE_STATUSES, APP_ROLES } from "@/lib/constants";
import { IconButton, TrashIcon } from "@/components/icon-button";

type Project = { id: string; name: string; type: string; status: string };
type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string;
  role: string;
  employeeCode: string;
  status: string;
  assignments: Array<{ id: string; project: Project }>;
  attendance: Array<{
    id: string;
    date: string;
    checkInAt: string;
    checkOutAt: string | null;
    project: { name: string } | null;
  }>;
  reports: Array<{ id: string; date: string; summary: string; project: { name: string; type: string } }>;
};

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const [e, p] = await Promise.all([
      api<{ employee: Employee }>(`/api/admin/employees/${id}`),
      api<{ projects: Project[] }>("/api/admin/projects"),
    ]);
    setEmployee(e.employee);
    setProjects(p.projects.filter((x) => x.status === "ACTIVE"));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const assignedIds = useMemo(
    () => new Set(employee?.assignments.map((a) => a.project.id) || []),
    [employee]
  );
  const available = projects.filter((p) => !assignedIds.has(p.id));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!employee) return;
    setSaving(true);
    setError(null);
    try {
      await api(`/api/admin/employees/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: employee.name,
          email: employee.email,
          phone: employee.phone,
          designation: employee.designation,
          role: employee.role,
          status: employee.status,
          ...(password ? { password } : {}),
        }),
      });
      setPassword("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function assign() {
    if (!selected) return;
    setError(null);
    try {
      await api(`/api/admin/employees/${id}/assign`, {
        method: "POST",
        body: JSON.stringify({ projectIds: [selected] }),
      });
      setSelected("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign project");
    }
  }

  async function unassign(projectId: string) {
    setError(null);
    try {
      await api(`/api/admin/employees/${id}/assign`, {
        method: "DELETE",
        body: JSON.stringify({ projectId }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove project");
    }
  }

  async function remove() {
    if (!confirm("Delete this employee?")) return;
    await api(`/api/admin/employees/${id}`, { method: "DELETE" });
    router.push("/employees");
  }

  if (!employee) return <p className="text-muted">Loading employee…</p>;

  return (
    <div>
      <PageHeader
        eyebrow={employee.employeeCode}
        title={employee.name}
        description="App login, role, project assignment, attendance and daily reports for this person."
        actions={
          <IconButton label="Delete" onClick={remove} tone="danger">
            <TrashIcon />
          </IconButton>
        }
      />

      <div className="grid gap-6 xl:grid-cols-5">
        <form className="card space-y-4 p-6 xl:col-span-3" onSubmit={save}>
          <ErrorText message={error} />
          <Field label="Full name">
            <input className="input" value={employee.name} onChange={(e) => setEmployee({ ...employee, name: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <input className="input" value={employee.email} onChange={(e) => setEmployee({ ...employee, email: e.target.value })} />
            </Field>
            <Field label="Contact number">
              <input
                className="input"
                required
                type="tel"
                inputMode="tel"
                placeholder="0300 1234567"
                value={employee.phone || ""}
                onChange={(e) => setEmployee({ ...employee, phone: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Designation">
              <input className="input" value={employee.designation} onChange={(e) => setEmployee({ ...employee, designation: e.target.value })} />
            </Field>
            <Field label="App role">
              <select className="select" value={employee.role || "STAFF"} onChange={(e) => setEmployee({ ...employee, role: e.target.value })}>
                {APP_ROLES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status">
              <select className="select" value={employee.status} onChange={(e) => setEmployee({ ...employee, status: e.target.value })}>
                {EMPLOYEE_STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Reset app password (optional)">
            <input className="input" placeholder="Leave blank to keep current" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <button className="btn btn-primary" disabled={saving} type="submit">
            {saving ? "Saving…" : "Save employee"}
          </button>
        </form>

        <div className="card p-5 xl:col-span-2">
          <h2 className="font-semibold">Assigned projects</h2>
          <div className="mt-4 mb-4 flex gap-2">
            <select className="select" value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Select project</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button className="btn btn-dark shrink-0" onClick={assign} type="button">
              Assign
            </button>
          </div>
          <div className="space-y-2">
            {employee.assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-2xl border border-line px-3 py-2.5">
                <div>
                  <Link className="font-semibold hover:text-leaf" href={`/projects/${a.project.id}`}>
                    {a.project.name}
                  </Link>
                  <div className="mt-1">
                    <TypeBadge type={a.project.type} />
                  </div>
                </div>
                <button className="btn btn-ghost px-3 py-1 text-xs" onClick={() => unassign(a.project.id)} type="button">
                  Remove
                </button>
              </div>
            ))}
            {employee.assignments.length === 0 ? <p className="text-sm text-muted">Not assigned to any project.</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="card">
          <h2 className="border-b border-line px-5 py-4 font-semibold">Recent attendance</h2>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>In</th>
                  <th>Out</th>
                </tr>
              </thead>
              <tbody>
                {employee.attendance.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.date)}</td>
                    <td>{formatTime(row.checkInAt)}</td>
                    <td>{row.checkOutAt ? formatTime(row.checkOutAt) : <StatusBadge status="ON_DUTY" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <h2 className="border-b border-line px-5 py-4 font-semibold">Recent reports</h2>
          <div className="divide-y divide-line">
            {employee.reports.map((report) => (
              <Link key={report.id} href={`/reports/${report.id}`} className="block px-5 py-3 hover:bg-canvas">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{formatDate(report.date)}</p>
                  <TypeBadge type={report.project.type} />
                </div>
                <p className="text-sm text-muted">{report.summary}</p>
              </Link>
            ))}
            {employee.reports.length === 0 ? <p className="px-5 py-6 text-sm text-muted">No reports yet.</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
