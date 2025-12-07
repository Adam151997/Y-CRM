import { Skeleton } from "@/components/ui/skeleton";
import { PageHeaderSkeleton, CardGridSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-40" />
      </div>
      <CardGridSkeleton count={8} />
    </div>
  );
}
