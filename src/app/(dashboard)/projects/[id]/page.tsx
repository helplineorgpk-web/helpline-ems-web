"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { Dropdown } from "@/components/dropdown";
import { DetailSkeleton } from "@/components/skeleton";
import { ErrorText, PageHeader, StatusBadge, TypeBadge } from "@/components/ui";
import { ProjectForm } from "@/components/project-form";
import { IconButton, IconLink, PencilIcon, TrashIcon } from "@/components/icon-button";
import { telHref } from "@/lib/phone";

type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string;
  employeeCode: string;
  status: string;
};

type Project = {
  id: string;
  name: string;
  code: string;
  type: string;
  location: string | null;
  description: string | null;
  status: string;
  assignments: Array<{ id: string; employee: Employee }>;
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [p, e] = await Promise.all([
      api<{ project: Project }>(`/api/admin/projects/${id}`),
      api<{ employees: Employee[] }>("/api/admin/employees"),
    ]);
    setProject(p.project);
    setEmployees(e.employees.filter((emp) => emp.status === "ACTIVE"));
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const assignedIds = useMemo(
    () => new Set(project?.assignments.map((a) => a.employee.id) || []),
    [project]
  );
  const available = employees.filter((e) => !assignedIds.has(e.id));

  async function assign() {
    if (!selected) return;
    setError(null);
    try {
      await api(`/api/admin/projects/${id}/assign`, {
        method: "POST",
        body: JSON.stringify({ employeeIds: [selected] }),
      });
      setSelected("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign employee");
    }
  }

  async function unassign(employeeId: string) {
    setError(null);
    try {
      await api(`/api/admin/projects/${id}/assign`, {
        method: "DELETE",
        body: JSON.stringify({ employeeId }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove employee");
    }
  }

  async function remove() {
    if (!confirm("Delete this project?")) return;
    await api(`/api/admin/projects/${id}`, { method: "DELETE" });
    router.push("/projects");
  }

  if (!project) return <DetailSkeleton />;

  return (
    <div className="grid gap-6 xl:grid-cols-5">
      <div className="xl:col-span-3">
        <PageHeader
          eyebrow="Project"
          title={project.name}
          description="Update project details and assign the employees who work here. Their app reports will land on this dashboard."
          actions={
            <div className="flex gap-2">
              <IconLink href={`/projects/${id}/edit`} label="Edit">
                <PencilIcon />
              </IconLink>
              <IconButton label="Delete" onClick={remove} tone="danger">
                <TrashIcon />
              </IconButton>
            </div>
          }
        />
        <div className="card p-6">
          <ErrorText message={error} />
          <ProjectForm
            key={project.id}
            initial={{
              name: project.name,
              code: project.code,
              type: project.type,
              location: project.location || "",
              description: project.description || "",
              status: project.status,
            }}
            submitLabel="Save changes"
            onSubmit={async (values) => {
              await api(`/api/admin/projects/${id}`, {
                method: "PATCH",
                body: JSON.stringify(values),
              });
              await load();
            }}
          />
        </div>
      </div>

      <div className="xl:col-span-2">
        <div className="card p-5">
          <h2 className="font-semibold">Assigned employees</h2>
          <p className="mt-1 mb-4 text-sm text-muted">Only assigned staff can submit reports for this project from the app.</p>
          <div className="mb-4 flex gap-2">
            <Dropdown
              value={selected}
              onChange={setSelected}
              placeholder="Select employee"
              options={[
                { value: "", label: "Select employee" },
                ...available.map((emp) => ({ value: emp.id, label: `${emp.name} · ${emp.designation}` })),
              ]}
            />
            <button className="btn btn-dark shrink-0" onClick={assign} type="button">
              Assign
            </button>
          </div>
          <div className="space-y-2">
            {project.assignments.length === 0 ? (
              <p className="text-sm text-muted">No staff assigned yet.</p>
            ) : (
              project.assignments.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-2xl border border-line px-3 py-2.5">
                  <div>
                    <Link className="font-semibold hover:text-leaf" href={`/employees/${a.employee.id}`}>
                      {a.employee.name}
                    </Link>
                    <p className="text-xs text-muted">
                      {a.employee.employeeCode} · {a.employee.designation}
                      {a.employee.phone ? (
                        <>
                          {" · "}
                          <a className="hover:text-leaf" href={telHref(a.employee.phone)}>
                            {a.employee.phone}
                          </a>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={a.employee.status} />
                    <button className="btn btn-ghost px-3 py-1 text-xs" onClick={() => unassign(a.employee.id)} type="button">
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <TypeBadge type={project.type} />
          <StatusBadge status={project.status} />
        </div>
      </div>
    </div>
  );
}
