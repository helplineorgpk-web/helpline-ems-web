"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Dropdown } from "@/components/dropdown";
import { TableSkeleton } from "@/components/skeleton";
import { EmptyState, ErrorText, PageHeader, StatusBadge } from "@/components/ui";
import { DELETION_REQUEST_STATUSES } from "@/lib/constants";
import { formatDateTime } from "@/lib/datetime";

type DeletionRequest = {
  id: string;
  employeeName: string;
  employeeCode: string;
  email: string | null;
  requestedAt: string;
  status: string;
  processingAdministrator: string | null;
};

type Payload = {
  requests: DeletionRequest[];
  stats: { total: number; pending: number; processing: number; completed: number };
};

const STAT_CARDS = [
  { key: "", label: "Total requests", stat: "total" },
  { key: "PENDING", label: "Pending requests", stat: "pending" },
  { key: "PROCESSING", label: "Requests under processing", stat: "processing" },
  { key: "COMPLETED", label: "Completed requests", stat: "completed" },
] as const;

export default function AccountDeletionsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    let active = true;
    const timer = setTimeout(() => {
      api<Payload>(`/api/admin/account-deletions?${params}`)
        .then((payload) => {
          if (!active) return;
          setData(payload);
          setError(null);
        })
        .catch((err) => {
          if (active) setError(err instanceof Error ? err.message : "Could not load requests");
        })
        .finally(() => {
          if (active) setReady(true);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [q, status, reloadKey]);

  async function startProcessing(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/api/admin/account-deletions/${id}/process`, { method: "POST" });
      setReloadKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start processing");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Employee Management"
        title="Account Deletion Requests"
        description="Review employee requests to close their accounts. Permanent deletion is limited to administrators who are authorized to delete accounts."
      />

      <ErrorText message={error} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map((card) => {
          const active = status === card.key;
          const value = data?.stats[card.stat] ?? "—";
          return (
            <button
              key={card.label}
              className={`card card-hover p-5 text-left ${active ? "ring-2 ring-leaf" : ""}`}
              onClick={() => setStatus(card.key)}
              type="button"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-muted">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
            </button>
          );
        })}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <input
          className="input sm:col-span-2"
          placeholder="Search name, employee ID, email, or administrator"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Dropdown
          ariaLabel="Request status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "", label: "All statuses" },
            ...DELETION_REQUEST_STATUSES.map((item) => ({ value: item.value, label: item.label })),
          ]}
        />
      </div>

      <div className="card">
        {!ready ? (
          <TableSkeleton rows={6} bare />
        ) : !data || data.requests.length === 0 ? (
          <EmptyState
            title="No deletion requests"
            hint="Requests submitted from the employee app will appear here for an administrator to review."
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Employee ID</th>
                  <th>Email</th>
                  <th>Request date</th>
                  <th>Status</th>
                  <th>Processing administrator</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.requests.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link className="font-semibold hover:text-leaf" href={`/account-deletions/${row.id}`}>
                        {row.employeeName}
                      </Link>
                    </td>
                    <td>{row.employeeCode}</td>
                    <td>{row.email || <span className="text-muted">—</span>}</td>
                    <td>{formatDateTime(row.requestedAt)}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>{row.processingAdministrator || <span className="text-muted">—</span>}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <Link className="btn btn-ghost px-3 py-1 text-xs" href={`/account-deletions/${row.id}`}>
                          Open
                        </Link>
                        {row.status === "PENDING" ? (
                          <button
                            className="btn btn-dark px-3 py-1 text-xs"
                            disabled={busyId === row.id}
                            onClick={() => startProcessing(row.id)}
                            type="button"
                          >
                            {busyId === row.id ? "Starting…" : "Start processing"}
                          </button>
                        ) : null}
                        {row.status === "PROCESSING" ? (
                          <Link
                            className="btn btn-danger px-3 py-1 text-xs"
                            href={`/account-deletions/${row.id}?confirm=1`}
                          >
                            Complete deletion
                          </Link>
                        ) : null}
                        <Link className="btn btn-ghost px-3 py-1 text-xs" href={`/account-deletions/${row.id}#request-history`}>
                          History
                        </Link>
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
