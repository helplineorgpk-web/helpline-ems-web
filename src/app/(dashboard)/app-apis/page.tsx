"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/client";

type Endpoint = {
  id: string;
  group: string;
  method: string;
  path: string;
  title: string;
  auth: string;
  body: string | null;
  notes: string | null;
};

export default function AppApisPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ endpoints: Endpoint[] }>("/api/admin/apis")
      .then((d) => setEndpoints(d.endpoints))
      .catch((e) => setError(e.message));
  }, []);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  }

  const app = endpoints.filter((e) => e.group === "app");
  const admin = endpoints.filter((e) => e.group === "admin");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="MongoDB"
        title="APIs stored in Atlas"
        description="These endpoint records live in Project 0 → Cluster0 → helplineems → ApiEndpoint, along with employees, projects, attendance and reports."
      />

      <div className="card mb-6 p-5 text-sm leading-6 text-muted">
        <p>
          Employee app flow: login → check-in on open → daily report at leaving time (also checks out). Roles: Staff
          (own attendance/report) and Supervisor (also sees team on assigned projects). Admin APIs power this dashboard.
        </p>
        <p className="mt-2">
          Demo staff: <strong className="text-ink">ahmed@helpline.org</strong> / <strong className="text-ink">Emp@123</strong>
          · Demo supervisor: <strong className="text-ink">fatima@helpline.org</strong> / <strong className="text-ink">Emp@123</strong>
        </p>
      </div>

      {error ? <p className="mb-4 text-danger">{error}</p> : null}

      <Section title="Employee app APIs" items={app} copied={copied} onCopy={copy} />
      <Section title="Admin dashboard APIs" items={admin} copied={copied} onCopy={copy} />
    </div>
  );
}

function Section({
  title,
  items,
  copied,
  onCopy,
}: {
  title: string;
  items: Endpoint[];
  copied: string | null;
  onCopy: (text: string) => void;
}) {
  return (
    <div className="mb-8">
      <h2 className="mb-4 font-semibold">{title}</h2>
      <div className="space-y-4">
        {items.map((item) => (
          <article key={item.id} className="card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-leaf-soft px-2.5 py-0.5 text-[11px] font-black tracking-wide text-leaf-dark">
                {item.method}
              </span>
              <code className="font-semibold">{item.path}</code>
              <span className="text-[11px] font-bold uppercase tracking-wide text-muted">{item.auth}</span>
              <button className="ml-auto text-xs font-bold text-leaf" onClick={() => onCopy(item.path)} type="button">
                {copied === item.path ? "Copied" : "Copy path"}
              </button>
            </div>
            <h3 className="mt-3 font-semibold">{item.title}</h3>
            {item.notes ? <p className="mt-1 text-sm text-muted">{item.notes}</p> : null}
            {item.body ? (
              <pre className="mt-3 overflow-auto rounded-2xl bg-forest-deep p-4 text-xs text-white/90">{item.body}</pre>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
