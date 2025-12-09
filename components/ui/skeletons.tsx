import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({ rows = 10, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="border rounded-lg">
      <div className="border-b p-4">
        <div className="flex items-center gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-24" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b last:border-b-0 p-4">
          <div className="flex items-center gap-4">
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-24" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}

export function ListPageSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <TableSkeleton />
    </div>
  );
}

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-lg" />
      ))}
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-xl" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-2" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>

      {/* List Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
}

export function KanbanSkeleton() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-72">
            <Skeleton className="h-10 w-full mb-3 rounded-lg" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
