import React from 'react';

// =====================================================================
// Skeleton loading primitives — shimmer xám nhạt, không cần thư viện.
// Dùng khi isInitializing/syncStatus==='loading' để trang không bị trắng.
// =====================================================================

export function SkeletonLine({ w = 'w-full', h = 'h-3', className = '' }) {
  return <div className={`${w} ${h} rounded bg-slate-200/80 animate-pulse ${className}`} />;
}

export function SkeletonTile({ className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      <SkeletonLine w="w-1/3" h="h-2.5" />
      <SkeletonLine w="w-1/2" h="h-5" className="mt-2" />
    </div>
  );
}

export function SkeletonStatsRow({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => <SkeletonTile key={i} />)}
    </div>
  );
}

export function SkeletonTableRows({ rows = 6, cols = 5 }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} h="h-4" w={c === 0 ? 'w-full' : 'w-2/3'} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Bố cục giả trang Dashboard admin: tiêu đề + stats + biểu đồ + bảng */
export function AdminPageSkeleton() {
  return (
    <div className="p-4 sm:p-6 space-y-4 animate-in">
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 h-20" />
      <SkeletonStatsRow />
      <div className="grid md:grid-cols-3 gap-3">
        <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <SkeletonLine w="w-1/4" h="h-3" />
          <div className="mt-3 flex items-end gap-2 h-36">
            {[40, 65, 50, 80, 60, 90, 70].map((hh, i) => (
              <div key={i} className="flex-1 bg-slate-200/80 rounded-t animate-pulse" style={{ height: hh + '%' }} />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><SkeletonLine w="w-1/2" /><SkeletonLine h="h-24" className="mt-3" /></div>
      </div>
      <SkeletonTableRows rows={7} cols={6} />
    </div>
  );
}

/** Bố cục giả trang nhân viên (dọc, thẻ) */
export function EmployeePageSkeleton() {
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">
      <SkeletonLine w="w-1/3" h="h-3" />
      <SkeletonLine w="w-1/2" h="h-6" />
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 h-28 animate-pulse opacity-80" />
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
        <SkeletonLine w="w-1/4" h="h-2.5" />
        <SkeletonLine w="w-3/4" h="h-4" />
      </div>
      <SkeletonTableRows rows={4} cols={4} />
    </div>
  );
}
