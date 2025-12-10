import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Download, 
  ExternalLink, 
  FileText, 
  Building2, 
  User,
  Calendar,
  HardDrive
} from "lucide-react";
import { format } from "date-fns";
import { formatBytes } from "@/lib/utils";
import { DocumentViewer } from "./_components/document-viewer";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const { orgId } = await getAuthContext();
  
  const document = await prisma.document.findFirst({
    where: { id, orgId },
  });

  return {
    title: document ? `${document.name} | Documents` : "Document Not Found",
  };
}

const typeColors: Record<string, string> = {
  CONTRACT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  PROPOSAL: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  INVOICE: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  PRESENTATION: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
};

export default async function DocumentViewPage({ params }: PageProps) {
  const { id } = await params;
  const { orgId } = await getAuthContext();

  const document = await prisma.document.findFirst({
    where: { id, orgId },
    include: {
      lead: { select: { id: true, firstName: true, lastName: true } },
      account: { select: { id: true, name: true } },
    },
  });

  if (!document) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Link href="/documents">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold tracking-tight">{document.name}</h1>
              <Badge variant="secondary" className={typeColors[document.type]}>
                {document.type}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <HardDrive className="h-4 w-4" />
                {formatBytes(document.fileSize)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(document.createdAt), "MMM d, yyyy")}
              </span>
              {document.lead && (
                <Link 
                  href={`/leads/${document.lead.id}`}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <User className="h-4 w-4" />
                  {document.lead.firstName} {document.lead.lastName}
                </Link>
              )}
              {document.account && (
                <Link 
                  href={`/accounts/${document.account.id}`}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Building2 className="h-4 w-4" />
                  {document.account.name}
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={document.fileUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </a>
          </Button>
          <Button asChild>
            <a href={document.fileUrl} download={document.name}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </a>
          </Button>
        </div>
      </div>

      {/* Document Viewer */}
      <Card>
        <CardContent className="p-0">
          <DocumentViewer
            url={document.fileUrl}
            mimeType={document.mimeType}
            fileName={document.name}
          />
        </CardContent>
      </Card>
    </div>
  );
}
