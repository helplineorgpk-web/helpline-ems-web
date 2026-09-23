"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { ErrorText, PageHeader } from "@/components/ui";
import { ProjectForm, type ProjectFormValues } from "@/components/project-form";
import { IconButton, TrashIcon } from "@/components/icon-button";

type Project = ProjectFormValues & { id: string };

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ project: Project }>(`/api/admin/projects/${id}`)
      .then((d) => setProject(d.project))
      .catch((err) => setError(err.message));
  }, [id]);

  async function remove() {
    if (!confirm("Delete this project and its assignments/reports?")) return;
    await api(`/api/admin/projects/${id}`, { method: "DELETE" });
    router.push("/projects");
  }

  if (error) return <ErrorText message={error} />;
  if (!project) return <p className="text-muted">Loading project…</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Projects"
        title={`Edit ${project.name}`}
        description="Update this project’s name, type, location and status."
        actions={
          <IconButton label="Delete" onClick={remove} tone="danger">
            <TrashIcon />
          </IconButton>
        }
      />
      <div className="card p-6">
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
          onCancel={() => router.push(`/projects/${id}`)}
          onSubmit={async (values) => {
            await api(`/api/admin/projects/${id}`, {
              method: "PATCH",
              body: JSON.stringify(values),
            });
            router.push(`/projects/${id}`);
          }}
        />
      </div>
    </div>
  );
}
