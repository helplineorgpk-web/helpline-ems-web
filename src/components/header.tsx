"use client";

import { useRouter } from "next/navigation";
import type { AdminToken } from "@/lib/auth";
import { formatDate, todayPK } from "@/lib/datetime";
import { NotificationBell } from "@/components/notifications";

export function Header({ admin }: { admin: AdminToken }) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-5 border-b border-line bg-paper/90 px-4 py-4 backdrop-blur sm:px-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Pakistan time</p>
        <p className="text-sm font-semibold text-ink">{formatDate(todayPK())}</p>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="hidden text-right sm:block">
          <p className="text-sm font-semibold">{admin.name}</p>
          <p className="text-xs text-muted">{admin.email}</p>
        </div>
        <button className="btn btn-ghost" onClick={logout} type="button">
          Logout
        </button>
      </div>
    </header>
  );
}
