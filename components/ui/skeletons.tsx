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
