export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Đang tải dữ liệu tài chính">
      <div className="space-y-2">
        <div className="h-8 w-44 animate-pulse rounded-lg bg-surface-card" />
        <div className="h-4 w-64 animate-pulse rounded bg-surface-card/70" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl border border-border bg-surface/70" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-surface/70 lg:col-span-5" />
        <div className="h-72 animate-pulse rounded-2xl border border-border bg-surface/70 lg:col-span-7" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-44 animate-pulse rounded-2xl border border-border bg-surface/70" />
        ))}
      </div>
    </div>
  );
}
