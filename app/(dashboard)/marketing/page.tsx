import { Suspense } from "react";
import { getAuthContext } from "@/lib/auth";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";

export default async function MarketingDashboardPage() {
  await getAuthContext(); // Ensure user is authenticated

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Marketing Hub</h2>
        <p className="text-muted-foreground">
          Campaigns, segments, and lead generation
        </p>
      </div>

      {/* Dynamic Dashboard Grid */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardGrid />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-4">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className={`
            bg-muted/50 rounded-lg animate-pulse
            ${i < 3 ? "col-span-4 h-32" : "col-span-4 h-48"}
          `}
        />
      ))}
    </div>
  );
}
