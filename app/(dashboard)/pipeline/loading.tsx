import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-72">
            <Skeleton className="h-12 rounded-t-lg mb-2" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-24 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
