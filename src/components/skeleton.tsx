import { cx } from "@/lib/client";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} aria-hidden="true" />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="card space-y-3 p-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="card p-5 xl:col-span-2">
          <Skeleton className="mb-5 h-5 w-40" />
          <TableSkeleton rows={4} bare />
        </div>
        <div className="card space-y-4 p-5">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 6, bare = false }: { rows?: number; bare?: boolean }) {
  const body = (
    <div className={cx("space-y-3", bare ? "" : "p-5")} role="status" aria-label="Loading">
      <Skeleton className="h-4 w-full" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-11 w-full" />
      ))}
    </div>
  );
  if (bare) return body;
  return <div className="card">{body}</div>;
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="card space-y-4 p-6 xl:col-span-3">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-11 w-full" />
          ))}
        </div>
        <div className="card space-y-4 p-6 xl:col-span-2">
          <Skeleton className="h-5 w-36" />
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
