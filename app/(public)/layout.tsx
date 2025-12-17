import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Form | Y-CRM",
  description: "Submit your information",
};

/**
 * Public layout - Minimal wrapper for public pages
 * ClerkProvider from root layout still wraps this, but pages won't require auth
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <main className="min-h-screen flex items-center justify-center p-4">
        {children}
      </main>
    </div>
  );
}
