import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { RecordActions } from "./_components/record-actions";

interface RecordDetailPageProps {
  params: Promise<{ slug: string; id: string }>;
}

export default async function RecordDetailPage({
  params,
}: RecordDetailPageProps) {
  const { orgId } = await getAuthContext();
  const { slug, id } = await params;

  // Get the module with fields
  const module = await prisma.customModule.findFirst({
    where: {
      orgId,
      slug,
    },
    include: {
      fields: {
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      },
    },
  });

  if (!module) {
    notFound();
  }

  // Get the record
  const record = await prisma.customModuleRecord.findFirst({
    where: {
      id,
      orgId,
      moduleId: module.id,
    },
  });

  if (!record) {
    notFound();
  }

  const data = record.data as Record<string, unknown>;
  const labelValue = String(data[module.labelField] || "Untitled");

  // Format field value for display
  const formatValue = (value: unknown, fieldType: string): React.ReactNode => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-muted-foreground">-</span>;
    }

    switch (fieldType) {
      case "BOOLEAN":
        return value ? (
          <Badge variant="default">Yes</Badge>
        ) : (
          <Badge variant="secondary">No</Badge>
        );
      case "DATE":
        return format(new Date(String(value)), "PPP");
      case "CURRENCY":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(Number(value));
      case "PERCENT":
        return `${value}%`;
      case "URL":
        return (
          <a
            href={String(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {String(value)}
          </a>
        );
      case "EMAIL":
        return (
          <a href={`mailto:${value}`} className="text-primary hover:underline">
            {String(value)}
          </a>
        );
      case "PHONE":
        return (
          <a href={`tel:${value}`} className="text-primary hover:underline">
            {String(value)}
          </a>
        );
      case "MULTISELECT":
        return Array.isArray(value) ? (
          <div className="flex flex-wrap gap-1">
            {value.map((v: string) => (
              <Badge key={v} variant="secondary">
                {v}
              </Badge>
            ))}
          </div>
        ) : (
          String(value)
        );
      case "SELECT":
        return <Badge variant="outline">{String(value)}</Badge>;
      case "TEXTAREA":
        return (
          <p className="whitespace-pre-wrap text-sm">{String(value)}</p>
        );
      default:
        return String(value);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/modules/${slug}`}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{labelValue}</h1>
            <p className="text-muted-foreground">
              {module.name} • Created{" "}
              {formatDistanceToNow(new Date(record.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/modules/${slug}/${id}/edit`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <RecordActions module={module} recordId={id} />
        </div>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            All information about this {module.name.toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-6 md:grid-cols-2">
            {module.fields.map((field) => (
              <div
                key={field.id}
                className={
                  field.fieldType === "TEXTAREA" ? "md:col-span-2" : ""
                }
              >
                <dt className="text-sm font-medium text-muted-foreground mb-1">
                  {field.fieldName}
                </dt>
                <dd className="text-sm">
                  {formatValue(data[field.fieldKey], field.fieldType)}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* Metadata Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 md:grid-cols-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Record ID</dt>
              <dd className="font-mono text-xs mt-1">{record.id}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="mt-1">
                {format(new Date(record.createdAt), "PPp")}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last Updated</dt>
              <dd className="mt-1">
                {format(new Date(record.updatedAt), "PPp")}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
