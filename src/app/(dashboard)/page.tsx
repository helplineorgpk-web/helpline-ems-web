"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { DashboardSkeleton } from "@/components/skeleton";
import { EmptyState, PageHeader, StatusBadge, TypeBadge } from "@/components/ui";
import { formatTime, durationBetween } from "@/lib/datetime";
import { IconLink, PlusIcon } from "@/components/icon-button";

type Stats = {
  today: string;
  stats: {
    projectCount: number;
    employeeCount: number;
    activeEmployeeCount: number;
    todayCheckins: number;
    todayCheckouts: number;
    todayReports: number;
    stillOnDuty: number;
  };
  typeCounts: Record<string, number>;
  recentReports: Array<{
    id: string;
    summary: string;
    details: string;
    date: string;
    createdAt: string;
    employee: { id: string; name: string; employeeCode: string };
    project: { id: string; name: string; type: string };
  }>;
  todayAttendance: Array<{
    id: string;
    checkInAt: string;
    checkOutAt: string | null;
    employee: { id: string; name: string; designation: string };
    project: { id: string; name: string; type: string } | null;
  }>;
  projects: Array<{
    id: string;
    name: string;
    type: string;
    _count: { assignments: number; reports: number };
  }>;
};

export default function OverviewPage() {
  const [data, setData] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function load() {
      api<Stats>("/api/admin/stats")
        .then(setData)
        .catch((e) => setError(e.message));
    }
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, []);

  if (error) return <p className="text-danger">{error}</p>;
  if (!data) return <DashboardSkeleton />;

  const cards = [
    { label: "Active projects", value: data.stats.projectCount, hint: "Across all project types" },
    { label: "Employees", value: data.stats.activeEmployeeCount, hint: `${data.stats.employeeCount} total records` },
    { label: "Checked in today", value: data.stats.todayCheckins, hint: `${data.stats.stillOnDuty} still on duty` },
    { label: "Reports today", value: data.stats.todayReports, hint: `${data.stats.todayCheckouts} already checked out` },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Dashboard"
        title="Today at Helpline"
        description="Live view of project staff: who arrived, who is still on duty, and which daily reports have come in from the app."
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card, index) => (
          <div
            key={card.label}
            className="card card-hover rise-in p-6"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-muted">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">{card.value}</p>
            <p className="mt-1 text-sm text-muted">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="font-semibold">Today’s attendance</h2>
            <Link className="text-sm font-semibold text-leaf" href="/attendance">
              View all
            </Link>
          </div>
          {data.todayAttendance.length === 0 ? (
            <EmptyState title="No check-ins yet" hint="When employees open the app and check in, they will appear here." />
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Project</th>
                    <th>In</th>
                    <th>Out</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.todayAttendance.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="font-semibold">{row.employee.name}</div>
                        <div className="text-xs text-muted">{row.employee.designation}</div>
                      </td>
                      <td>{row.project?.name || "—"}</td>
                      <td>{formatTime(row.checkInAt)}</td>
                      <td>
                        {row.checkOutAt
                          ? `${formatTime(row.checkOutAt)} · ${durationBetween(row.checkInAt, row.checkOutAt)}`
                          : "—"}
                      </td>
                      <td>
                        <StatusBadge status={row.checkOutAt ? "CHECKED_OUT" : "ON_DUTY"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-4 font-semibold">Projects by type</h2>
            <div className="space-y-3">
              {Object.entries(data.typeCounts).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between gap-3">
                  <TypeBadge type={type} />
                  <div className="flex flex-1 items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-leaf-soft">
                      <div
                        className="h-full rounded-full bg-leaf"
                        style={{ width: `${Math.max(12, (count / Math.max(data.stats.projectCount, 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-sm font-semibold">{count}</span>
                  </div>
                </div>
              ))}
              {Object.keys(data.typeCounts).length === 0 ? (
                <p className="text-sm text-muted">No projects yet.</p>
              ) : null}
            </div>
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Today’s reports</h2>
              <Link className="text-sm font-semibold text-leaf" href="/reports">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {data.recentReports.length === 0 ? (
                <p className="text-sm text-muted">No reports received today yet.</p>
              ) : (
                data.recentReports.map((report) => (
                  <Link key={report.id} href={`/reports/${report.id}`} className="block rounded-2xl border border-line p-3 hover:bg-canvas">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{report.employee.name}</p>
                      <span className="text-xs text-muted">{formatTime(report.createdAt)}</span>
                    </div>
                    <div className="mt-1">
                      <TypeBadge type={report.project.type} />
                    </div>
                    <p className="mt-2 font-medium">{report.summary}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">{report.details}</p>
                    <p className="mt-1 text-xs text-muted">{report.project.name}</p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 card">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-semibold">Projects</h2>
          <IconLink href="/projects/new" label="Create project" tone="primary">
            <PlusIcon />
          </IconLink>
        </div>
        <div className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3">
          {data.projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`} className="bg-paper p-5 hover:bg-canvas">
              <TypeBadge type={project.type} />
              <h3 className="mt-3 font-semibold">{project.name}</h3>
              <p className="mt-1 text-sm text-muted">
                {project._count.assignments} staff · {project._count.reports} reports
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
