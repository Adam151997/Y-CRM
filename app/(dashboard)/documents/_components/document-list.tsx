import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { DocumentCard } from "./document-card";
import { FileText } from "lucide-react";

export async function DocumentList() {
  const { orgId } = await getAuthContext();

  const documents = await prisma.document.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: {
      lead: { select: { id: true, firstName: true, lastName: true } },
      account: { select: { id: true, name: true } },
    },
  });

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <FileText className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
        <p className="text-muted-foreground max-w-sm">
          Upload your first document to get started. You can attach documents to
          leads and accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {documents.map((doc) => (
        <DocumentCard key={doc.id} document={doc} />
      ))}
    </div>
  );
}
