import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getAuthContext } from "@/lib/auth";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";

export default async function SalesDashboardPage() {
  await getAuthContext(); // Ensure user is authenticated
  const t = await getTranslations("dashboard");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("sales.title")}</h2>
        <p className="text-muted-foreground">
          {t("sales.description")}
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
