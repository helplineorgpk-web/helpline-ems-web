"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { ProjectForm } from "@/components/project-form";
import { api } from "@/lib/client";

export default function NewProjectPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Projects"
        title="Create a project"
        description="Add a Helpline project. You can assign employees after saving."
      />
      <div className="card p-6">
        <ProjectForm
          submitLabel="Save project"
          onCancel={() => router.push("/projects")}
          onSubmit={async (values) => {
            const res = await api<{ project: { id: string } }>("/api/admin/projects", {
              method: "POST",
              body: JSON.stringify(values),
            });
            router.push(`/projects/${res.project.id}`);
          }}
        />
      </div>
      <p className="mt-4 text-sm text-muted">
        Need a new category first?{" "}
        <Link className="font-semibold text-leaf" href="/types">
          Manage types
        </Link>
      </p>
    </div>
  );
}
