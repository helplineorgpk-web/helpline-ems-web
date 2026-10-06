"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { formatTime } from "@/lib/datetime";

export type AdminNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  reportId: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
};

type NotificationsState = {
  notifications: AdminNotification[];
  unreadCount: number;
  toast: AdminNotification | null;
  dismissToast: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsState | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState<AdminNotification | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const ready = useRef(false);

  const refresh = useCallback(async () => {
    const data = await api<{ notifications: AdminNotification[]; unreadCount: number }>(
      "/api/admin/notifications"
    );
    if (ready.current) {
      const fresh = data.notifications.filter((item) => !item.read && !seen.current.has(item.id));
      if (fresh[0]) setToast(fresh[0]);
    }
    data.notifications.forEach((item) => seen.current.add(item.id));
    ready.current = true;
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  }, []);

  useEffect(() => {
    refresh().catch(() => null);
    const timer = setInterval(() => refresh().catch(() => null), 8000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 8000);
    return () => clearTimeout(timer);
  }, [toast]);

  const markRead = useCallback(async (id: string) => {
    await api(`/api/admin/notifications/${id}`, { method: "PATCH" });
    await refresh();
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    await api("/api/admin/notifications", {
      method: "POST",
      body: JSON.stringify({ action: "read-all" }),
    });
    setToast(null);
    await refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      toast,
      dismissToast: () => setToast(null),
      markRead,
      markAllRead,
      refresh,
    }),
    [notifications, unreadCount, toast, markRead, markAllRead, refresh]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside NotificationsProvider");
  return ctx;
}

export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, toast, dismissToast, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);

  async function openNotification(item: AdminNotification) {
    await markRead(item.id);
    setOpen(false);
    dismissToast();
    router.push(alertHref(item));
  }

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-paper text-ink hover:bg-canvas"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-leaf px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[22rem] overflow-hidden rounded-2xl border border-line bg-paper shadow-lg">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 ? (
              <button className="text-xs font-semibold text-leaf" onClick={markAllRead} type="button">
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-96 overflow-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted">No alerts yet.</p>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  className={`block w-full border-b border-line px-4 py-3 text-left last:border-0 hover:bg-canvas ${
                    item.read ? "" : "bg-leaf-soft/50"
                  }`}
                  onClick={() => openNotification(item)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-ink">{item.title}</p>
                    <span className="shrink-0 text-[11px] text-muted">{formatTime(item.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{item.body}</p>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}

      {toast ? (
        <button
          className="absolute right-0 top-12 z-40 w-80 rounded-2xl border border-leaf/30 bg-paper p-4 text-left shadow-lg"
          onClick={() => openNotification(toast)}
          type="button"
        >
          <p className="text-[11px] font-bold uppercase tracking-wider text-leaf">{alertLabel(toast.type)}</p>
          <p className="mt-1 text-sm font-semibold text-ink">{toast.body}</p>
          <p className="mt-2 text-xs text-muted">
            {toast.type === "CHECKIN" || toast.type === "CHECKOUT" ? "View attendance" : "View report"}
          </p>
        </button>
      ) : null}
    </div>
  );
}

function alertLabel(type: string) {
  if (type === "CHECKIN") return "Check-in";
  if (type === "CHECKOUT") return "Check-out";
  return "New report";
}

function alertHref(item: AdminNotification) {
  if (item.type === "CHECKIN" || item.type === "CHECKOUT") return "/attendance";
  return item.reportId ? `/reports/${item.reportId}` : "/reports";
}

function BellIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 9.5A6 6 0 0 1 18 9.5c0 6 2 7.5 2 7.5H4s2-1.5 2-7.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
