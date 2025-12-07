import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 p-4 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
            <Skeleton className={`h-16 rounded-lg ${i % 2 === 0 ? "w-64" : "w-80"}`} />
          </div>
        ))}
      </div>

      {/* Input area */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-12 flex-1 rounded-lg" />
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
