"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Dropdown } from "@/components/dropdown";
import { TableSkeleton } from "@/components/skeleton";
import { EmptyState, ErrorText, PageHeader, StatusBadge, TypeBadge } from "@/components/ui";
import { useProjectTypes } from "@/components/project-types";
import { EyeIcon, IconButton, IconLink, PencilIcon, PlusIcon, TrashIcon } from "@/components/icon-button";
import { PROJECT_STATUSES } from "@/lib/constants";

type Project = {
  id: string;
  name: string;
  code: string;
  type: string;
  location: string | null;
  status: string;
  _count: { assignments: number; reports: number };
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const { types, reload } = useProjectTypes();

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    const data = await api<{ projects: Project[] }>(`/api/admin/projects?${params}`);
    setProjects(data.projects);
    setReady(true);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      load().catch((e) => {
        setError(e.message);
        setReady(true);
      });
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, type, status]);

  async function remove(project: Project) {
    if (!confirm(`Delete “${project.name}”? Assigned staff links and reports for this project will also be removed.`)) {
      return;
    }
    setBusyId(project.id);
    setError(null);
    try {
      await api(`/api/admin/projects/${project.id}`, { method: "DELETE" });
      await Promise.all([load(), reload()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete project");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Projects"
        description="Create, edit or delete Helpline projects, then assign the staff who work there."
        actions={
          <div className="flex gap-2">
            <IconLink href="/projects/new" label="Create project" tone="primary">
              <PlusIcon />
            </IconLink>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <input
          className="input sm:col-span-1"
          placeholder="Search by name, code or location"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Dropdown
          value={type}
          onChange={setType}
          options={[{ value: "", label: "All types" }, ...types.map((item) => ({ value: item.slug, label: item.name }))]}
        />
        <Dropdown
          value={status}
          onChange={setStatus}
          options={[{ value: "", label: "All statuses" }, ...PROJECT_STATUSES.map((item) => ({ value: item.value, label: item.label }))]}
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {types.map((item) => (
          <button
            key={item.slug}
            type="button"
            onClick={() => setType(type === item.slug ? "" : item.slug)}
            className={`rounded-full border px-3 py-1 text-xs font-bold ${
              type === item.slug ? "border-leaf bg-leaf-soft text-leaf-dark" : "border-line bg-paper text-muted"
            }`}
          >
            {item.name} · {item.projectCount ?? 0}
          </button>
        ))}
      </div>

      <ErrorText message={error} />

      <div className="card mt-4">
        {!ready ? (
          <TableSkeleton rows={6} bare />
        ) : projects.length === 0 ? (
          <EmptyState title="No projects found" hint="Create your first project to start assigning employees." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Staff</th>
                  <th>Reports</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <Link className="font-semibold hover:text-leaf" href={`/projects/${project.id}`}>
                        {project.name}
                      </Link>
                      <div className="text-xs text-muted">{project.code}</div>
                    </td>
                    <td>
                      <TypeBadge type={project.type} />
                    </td>
                    <td>{project.location || "—"}</td>
                    <td>{project._count.assignments}</td>
                    <td>{project._count.reports}</td>
                    <td>
                      <StatusBadge status={project.status} />
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <IconLink href={`/projects/${project.id}`} label="View">
                          <EyeIcon />
                        </IconLink>
                        <IconLink href={`/projects/${project.id}/edit`} label="Edit">
                          <PencilIcon />
                        </IconLink>
                        <IconButton
                          disabled={busyId === project.id}
                          label="Delete"
                          onClick={() => remove(project)}
                          tone="danger"
                        >
                          <TrashIcon />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
