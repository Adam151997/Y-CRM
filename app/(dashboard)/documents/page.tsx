import { Suspense } from "react";
import { Metadata } from "next";
import { DocumentList } from "./_components/document-list";
import { DocumentsHeader } from "./_components/documents-header";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Documents | Y-CRM",
  description: "Manage your documents and files",
};

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <DocumentsHeader />
      <Suspense fallback={<DocumentsLoading />}>
        <DocumentList />
      </Suspense>
    </div>
  );
}

function DocumentsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-lg" />
      ))}
    </div>
  );
}
