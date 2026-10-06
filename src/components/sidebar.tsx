"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cx } from "@/lib/client";
import { useNotifications } from "@/components/notifications";

const links = [
  { href: "/", label: "Overview", icon: HomeIcon },
  { href: "/projects", label: "Projects", icon: FolderIcon },
  { href: "/types", label: "Project Types", icon: TagIcon },
  { href: "/employees", label: "Employees", icon: PeopleIcon },
  { href: "/attendance", label: "Attendance", icon: ClockIcon },
  { href: "/reports", label: "Daily Reports", icon: NoteIcon },
  { href: "/app-apis", label: "Mobile App APIs", icon: PhoneIcon },
  { href: "/password", label: "Change password", icon: KeyIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const nav = (
    <nav className="flex flex-1 flex-col gap-1.5 px-4">
      {links.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => setOpen(false)}
            className={cx(
              "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition duration-200",
              active
                ? "bg-white/10 text-white shadow-inner"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon />
            <span className="flex-1">{link.label}</span>
            {link.href === "/reports" && unreadCount > 0 ? (
              <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-forest-deep">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-line bg-paper px-4 py-3 lg:hidden">
        <Brand compact />
        <button className="btn btn-ghost" onClick={() => setOpen((v) => !v)} type="button">
          Menu
        </button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-40 bg-forest-deep/40 lg:hidden" onClick={() => setOpen(false)}>
          <aside
            className="absolute left-0 top-0 flex h-full w-72 flex-col bg-forest-deep py-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pb-6">
              <Brand onDark />
            </div>
            {nav}
          </aside>
        </div>
      ) : null}

      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 flex-col bg-forest-deep py-6 text-white lg:flex">
        <div className="px-5 pb-8">
          <Brand onDark />
        </div>
        {nav}
        <div className="mt-auto px-5 pt-6 text-[11px] leading-relaxed text-white/40">
          Helpline Welfare Trust
          <br />
          Employee Management System
        </div>
      </aside>
    </>
  );
}

function Brand({ compact = false, onDark = false }: { compact?: boolean; onDark?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-leaf text-lg font-black text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.15)]">
        H
      </div>
      <div>
        <div className={`text-sm font-extrabold tracking-wide ${onDark ? "text-white" : "text-forest"}`}>
          HELPLINE{compact ? "" : ""}
        </div>
        <div className={`text-[11px] font-medium ${onDark ? "text-white/55" : "text-muted"}`}>
          Welfare Trust · EMS
        </div>
      </div>
    </div>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function FolderIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2h7.5A2.5 2.5 0 0 1 21 9.5v8A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-10Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function PeopleIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="7" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M22 21v-2a3.5 3.5 0 0 0-2.5-3.35" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16.5 4.15a3.2 3.2 0 0 1 0 5.7" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4.5l3 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function NoteIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <path d="M7 3.8h7.2L20 9.5V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5.8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M14 3.8V9h5.5M8.5 13h7M8.5 16.5h5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <rect x="7" y="3" width="10" height="18" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11 18.5h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function KeyIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <circle cx="8" cy="15" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11.2 12.2 20 3.5M16.5 7l2.2 2.2M14.2 9.2l2.2 2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function TagIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 12.5V5.8A1.8 1.8 0 0 1 5.8 4H12l8 8-7.2 7.2L4 12.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="9" cy="9" r="1.2" fill="currentColor" />
    </svg>
  );
}
