"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { DetailSkeleton } from "@/components/skeleton";
import { PageHeader, StatusBadge, TypeBadge } from "@/components/ui";
import { durationBetween, formatDate, formatTime } from "@/lib/datetime";
import { telHref } from "@/lib/phone";

type Payload = {
  report: {
    id: string;
    date: string;
    summary: string;
    details: string;
    createdAt: string;
    employee: {
      id: string;
      name: string;
      employeeCode: string;
      designation: string;
      email: string;
      phone: string | null;
    };
    project: { id: string; name: string; type: string; code: string; location: string | null };
  };
  attendance: {
    checkInAt: string;
    checkOutAt: string | null;
  } | null;
};

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Payload | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setData(null);
    setMissing(false);
    api<Payload>(`/api/admin/reports/${id}`)
      .then(setData)
      .catch(() => setMissing(true));
  }, [id]);

  if (missing) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <h1 className="text-2xl font-semibold">Report not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This report is no longer available. It may have been removed when the database was reset.
        </p>
        <Link className="btn btn-primary mt-6" href="/reports">
          Back to reports
        </Link>
      </div>
    );
  }

  if (!data) return <DetailSkeleton />;
  const { report, attendance } = data;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={formatDate(report.date)}
        title={report.employee.name}
        description={`${report.employee.designation} · ${report.employee.employeeCode}${
          report.employee.phone ? ` · ${report.employee.phone}` : ""
        }`}
      />

      <div className="mb-5 flex flex-wrap gap-2">
        <TypeBadge type={report.project.type} />
        <Link className="btn btn-ghost py-1 text-xs" href={`/projects/${report.project.id}`}>
          {report.project.name}
        </Link>
        <Link className="btn btn-ghost py-1 text-xs" href={`/employees/${report.employee.id}`}>
          Employee profile
        </Link>
        {report.employee.phone && telHref(report.employee.phone) ? (
          <a className="btn btn-ghost py-1 text-xs" href={telHref(report.employee.phone)}>
            {report.employee.phone}
          </a>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Check-in</p>
          <p className="mt-1 text-lg font-semibold">{attendance ? formatTime(attendance.checkInAt) : "—"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Check-out</p>
          <p className="mt-1 text-lg font-semibold">{attendance?.checkOutAt ? formatTime(attendance.checkOutAt) : "—"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Time on duty</p>
          <p className="mt-1 text-lg font-semibold">
            {attendance?.checkOutAt ? durationBetween(attendance.checkInAt, attendance.checkOutAt) : <StatusBadge status="ON_DUTY" />}
          </p>
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="text-lg font-semibold">{report.summary}</h2>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink/90">{report.details}</p>
        <p className="mt-6 text-xs text-muted">Received at {formatTime(report.createdAt)}</p>
      </div>
    </div>
  );
}
