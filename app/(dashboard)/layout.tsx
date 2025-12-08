import { DynamicSidebar } from "@/components/layout/dynamic-sidebar";
import { Header } from "@/components/layout/header";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { WorkspaceProvider } from "@/lib/workspace";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkspaceProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Sidebar - Desktop */}
        <div className="hidden lg:flex">
          <DynamicSidebar />
        </div>

        {/* Sidebar - Mobile */}
        <MobileSidebar />

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </WorkspaceProvider>
  );
}
