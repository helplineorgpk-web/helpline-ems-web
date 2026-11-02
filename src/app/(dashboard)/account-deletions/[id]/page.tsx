"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/lib/client";
import { DetailSkeleton } from "@/components/skeleton";
import { ErrorText, PageHeader, StatusBadge } from "@/components/ui";
import { appRoleLabel } from "@/lib/constants";
import { formatDateTime } from "@/lib/datetime";

type Detail = {
  canCompleteDeletion: boolean;
  request: {
    id: string;
    status: string;
    reason: string | null;
    requestedAt: string;
    employeeName: string;
    employeeCode: string;
    employeeEmail: string | null;
    employeePhone: string | null;
    designation: string;
    appRole: string;
    employeeStatus: string;
    processingAdministrator: string | null;
    processingStartedAt: string | null;
    completedBy: string | null;
    completedAt: string | null;
  };
  employee: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    employeeCode: string;
    designation: string;
    role: string;
    status: string;
    projects: Array<{ id: string; name: string }>;
  } | null;
  impact: {
    accountExists: boolean;
    assignments: number;
    attendance: number;
    reports: number;
  };
  events: Array<{
    id: string;
    action: string;
    actorName: string;
    actorRole: string;
    note: string | null;
    createdAt: string;
  }>;
};

const EVENT_LABELS: Record<string, string> = {
  SUBMITTED: "Request submitted",
  PROCESSING_STARTED: "Processing started",
  COMPLETED: "Account deletion completed",
};

export default function AccountDeletionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function load() {
    return api<Detail>(`/api/admin/account-deletions/${id}`).then(setDetail);
  }

  useEffect(() => {
    let active = true;
    api<Detail>(`/api/admin/account-deletions/${id}`)
      .then((data) => {
        if (!active) return;
        setDetail(data);
        const params = new URLSearchParams(window.location.search);
        if (params.get("confirm") === "1" && data.request.status !== "COMPLETED" && data.canCompleteDeletion) {
          setConfirmOpen(true);
        }
      })
      .catch(() => {
        if (active) setMissing(true);
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!detail || window.location.hash !== "#request-history") return;
    document.getElementById("request-history")?.scrollIntoView({ behavior: "smooth" });
  }, [detail]);

  useEffect(() => {
    if (!confirmOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setConfirmOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirmOpen]);

  async function completeDeletion(event: React.FormEvent) {
    event.preventDefault();
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/account-deletions/${id}/complete`, {
        method: "POST",
        body: JSON.stringify({ employeeCode: detail.request.employeeCode }),
      });
      setConfirmOpen(false);
      setDetail((current) =>
        current
          ? {
              ...current,
              employee: null,
              request: {
                ...current.request,
                status: "COMPLETED",
                completedAt: new Date().toISOString(),
                completedBy: current.request.completedBy,
              },
            }
          : current
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the account");
    } finally {
      setBusy(false);
    }
  }

  function viewHistory() {
    document.getElementById("request-history")?.scrollIntoView({ behavior: "smooth" });
  }

  if (missing) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <h1 className="text-2xl font-semibold">Request not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">This account deletion request is no longer available.</p>
        <Link className="btn btn-primary mt-6" href="/account-deletions">
          Back to requests
        </Link>
      </div>
    );
  }

  if (!detail) return <DetailSkeleton />;

  const { request, employee, impact } = detail;
  const shownName = employee?.name || request.employeeName;
  const shownCode = request.employeeCode;
  const shownEmail = employee?.email || request.employeeEmail;
  const shownPhone = employee?.phone || request.employeePhone;
  const shownDesignation = employee?.designation || request.designation;
  const shownRole = employee?.role || request.appRole;
  const shownStatus = employee?.status || (impact.accountExists ? request.employeeStatus : "REMOVED");
  const nameChanged = Boolean(employee && employee.name !== request.employeeName);

  return (
    <div>
      <PageHeader
        eyebrow="Employee Management"
        title={shownName}
        description={`${shownCode} · ${shownDesignation}`}
        actions={
          <Link className="btn btn-ghost" href="/account-deletions">
            All requests
          </Link>
        }
      />

      <ErrorText message={error} />

      <div className="grid gap-6 xl:grid-cols-5">
        <section className="card p-6 xl:col-span-3">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Employee information</h2>
            <StatusBadge status={request.status} />
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Info label="Name" value={shownName} />
            <Info label="Employee ID" value={shownCode} />
            <Info label="Email" value={shownEmail || "—"} />
            <Info label="Phone" value={shownPhone || "—"} />
            <Info label="Designation" value={shownDesignation} />
            <Info label="App role" value={appRoleLabel(shownRole)} />
            <Info label="Account status" value={shownStatus === "REMOVED" ? "Account removed" : shownStatus} />
            <Info label="Projects" value={employee?.projects.map((project) => project.name).join(", ") || "—"} />
          </dl>
          {nameChanged ? (
            <p className="mt-4 text-sm text-muted">Submitted under the name {request.employeeName}.</p>
          ) : null}
          {!employee ? (
            <p className="mt-4 text-sm text-muted">
              This account is no longer in the system. The details above are the snapshot saved with the request.
            </p>
          ) : null}
          {employee ? (
            <Link className="mt-5 inline-flex text-sm font-semibold text-leaf" href={`/employees/${employee.id}`}>
              Open employee record
            </Link>
          ) : null}
        </section>

        <section className="card space-y-4 p-6 xl:col-span-2">
          <h2 className="font-semibold">Request</h2>
          <Info label="Submitted" value={formatDateTime(request.requestedAt)} />
          <Info label="Reason" value={request.reason?.trim() || "No reason was provided."} />
          <Info label="Current status" value={request.status.replaceAll("_", " ")} />
          {request.completedBy ? <Info label="Completed by" value={request.completedBy} /> : null}

          <div className="border-t border-line pt-4">
            <h3 className="mb-3 text-sm font-semibold">Administrative actions</h3>
            <div className="flex flex-col gap-2">
              {request.status !== "COMPLETED" ? (
                <button
                  className="btn btn-danger"
                  disabled={!detail.canCompleteDeletion || busy}
                  onClick={() => setConfirmOpen(true)}
                  type="button"
                >
                  Delete account
                </button>
              ) : null}
              <button className="btn btn-ghost" onClick={viewHistory} type="button">
                View request history
              </button>
            </div>
            {request.status === "COMPLETED" ? (
              <p className="mt-3 text-sm leading-relaxed text-muted">
                This request is complete
                {request.completedAt ? ` as of ${formatDateTime(request.completedAt)}` : ""}.
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <section className="card mt-6 p-6">
        <h2 className="font-semibold">What deletion changes</h2>
        <ImpactList impact={impact} />
      </section>

      <section className="card mt-6" id="request-history">
        <h2 className="border-b border-line px-6 py-4 font-semibold">Request history</h2>
        {detail.events.length === 0 ? (
          <p className="px-6 py-6 text-sm text-muted">No history recorded yet.</p>
        ) : (
          <ol className="divide-y divide-line">
            {detail.events.map((event) => (
              <li key={event.id} className="px-6 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{EVENT_LABELS[event.action] || event.action}</p>
                  <p className="text-xs text-muted">{formatDateTime(event.createdAt)}</p>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {event.actorName} · {event.actorRole === "admin" ? "Administrator" : "Employee"}
                </p>
                {event.note ? <p className="mt-2 text-sm leading-relaxed">{event.note}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      {confirmOpen
        ? createPortal(
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-forest-deep/50 p-4 sm:items-center">
          <form
            aria-labelledby="delete-account-title"
            aria-modal="true"
            className="card max-h-[90vh] w-full max-w-lg overflow-auto p-6"
            onSubmit={completeDeletion}
            role="dialog"
          >
            <h2 className="text-xl font-semibold" id="delete-account-title">
              Permanently delete this account?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Confirm this is the employee you intend to remove. Deletion cannot be undone.
            </p>

            <dl className="mt-5 grid gap-3 rounded-2xl border border-line bg-canvas px-4 py-4 sm:grid-cols-2">
              <Info label="Name" value={shownName} />
              <Info label="Employee ID" value={shownCode} />
              <Info label="Email" value={shownEmail || "—"} />
              <Info label="Phone" value={shownPhone || "—"} />
              <Info label="Designation" value={shownDesignation} />
              <Info label="Role" value={appRoleLabel(shownRole)} />
            </dl>

            <div className="mt-4">
              <ImpactList impact={impact} />
            </div>

            <ErrorText message={error} />

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setConfirmOpen(false)} type="button">
                Cancel
              </button>
              <button className="btn btn-danger" disabled={busy} type="submit">
                {busy ? "Deleting…" : "Delete account permanently"}
              </button>
            </div>
          </form>
        </div>,
        document.body
        )
        : null}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

function ImpactList({
  impact,
}: {
  impact: { accountExists: boolean; assignments: number; attendance: number; reports: number };
}) {
  const lines = impact.accountExists
    ? [
        "The employee will no longer be able to sign in to the mobile app.",
        `${impact.assignments} project assignment${impact.assignments === 1 ? "" : "s"} will be removed.`,
        `${impact.attendance} attendance record${impact.attendance === 1 ? "" : "s"} will be removed.`,
        `${impact.reports} daily report${impact.reports === 1 ? "" : "s"} will be removed.`,
        "This deletion request and its history will be kept.",
      ]
    : [
        "The employee account has already been removed.",
        `${impact.assignments} project assignment${impact.assignments === 1 ? "" : "s"} were removed.`,
        `${impact.attendance} attendance record${impact.attendance === 1 ? "" : "s"} were removed.`,
        `${impact.reports} daily report${impact.reports === 1 ? "" : "s"} were removed.`,
        "This deletion request and its history are kept.",
      ];

  return (
    <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}
