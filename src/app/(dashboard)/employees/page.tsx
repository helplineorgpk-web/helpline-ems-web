"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { EmptyState, PageHeader, StatusBadge, TypeBadge } from "@/components/ui";
import { IconLink, PlusIcon } from "@/components/icon-button";
import { telHref } from "@/lib/phone";
import { APP_ROLES, appRoleLabel } from "@/lib/constants";

type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string;
  role: string;
  employeeCode: string;
  status: string;
  assignments: Array<{ project: { id: string; name: string; type: string } }>;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (role) params.set("role", role);
    const t = setTimeout(() => {
      api<{ employees: Employee[] }>(`/api/admin/employees?${params}`).then((d) => setEmployees(d.employees));
    }, 200);
    return () => clearTimeout(t);
  }, [q, status, role]);

  return (
    <div>
      <PageHeader
        eyebrow="People"
        title="Employees"
        description="Create staff or supervisor accounts for the mobile app, then assign each person to the project they work on."
        actions={
          <IconLink href="/employees/new" label="Add employee" tone="primary">
            <PlusIcon />
          </IconLink>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-4">
        <input className="input sm:col-span-2" placeholder="Search name, email, code, phone" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">All roles</option>
          {APP_ROLES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <div className="card">
        {employees.length === 0 ? (
          <EmptyState title="No employees yet" hint="Add staff so they can log in to the app and send daily reports." />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Role</th>
                  <th>Contact number</th>
                  <th>Email</th>
                  <th>Assigned projects</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>
                      <Link className="font-semibold hover:text-leaf" href={`/employees/${emp.id}`}>
                        {emp.name}
                      </Link>
                      <div className="text-xs text-muted">
                        {emp.employeeCode} · {emp.designation}
                      </div>
                    </td>
                    <td>{appRoleLabel(emp.role)}</td>
                    <td>
                      {emp.phone && telHref(emp.phone) ? (
                        <a className="font-semibold hover:text-leaf" href={telHref(emp.phone)}>
                          {emp.phone}
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>{emp.email}</td>
                    <td>
                      <div className="flex flex-wrap gap-1.5">
                        {emp.assignments.length === 0 ? (
                          <span className="text-xs text-muted">Unassigned</span>
                        ) : (
                          emp.assignments.map((a) => <TypeBadge key={a.project.id} type={a.project.type} />)
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted">
                        {emp.assignments.map((a) => a.project.name).join(" · ") || "Assign a project"}
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={emp.status} />
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
