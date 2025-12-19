"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RelationshipDisplay } from "@/components/forms/relationship-field-input";
import { format } from "date-fns";
import { File, ExternalLink, Download } from "lucide-react";

interface Field {
  id: string;
  fieldName: string;
  fieldKey: string;
  fieldType: string;
  relatedModule?: string | null;
}

interface RecordDetailFieldsProps {
  fields: Field[];
  data: Record<string, unknown>;
}

export function RecordDetailFields({ fields, data }: RecordDetailFieldsProps) {
  // Format field value for display
  const formatValue = (value: unknown, field: Field): React.ReactNode => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-muted-foreground">-</span>;
    }

    switch (field.fieldType) {
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
      case "RELATIONSHIP":
        if (!field.relatedModule) {
          return String(value);
        }
        return (
          <RelationshipDisplay
            relatedModule={field.relatedModule}
            value={String(value)}
            showLink={true}
          />
        );
      case "FILE":
        const fileValue = value as { url?: string; name?: string; size?: number; type?: string } | null;
        if (!fileValue?.url) {
          return <span className="text-muted-foreground">-</span>;
        }
        return (
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 max-w-md">
            <File className="h-8 w-8 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileValue.name}</p>
              <p className="text-xs text-muted-foreground">
                {fileValue.size ? `${(fileValue.size / 1024).toFixed(1)} KB` : ""}
                {fileValue.type ? ` • ${fileValue.type.split("/")[1]?.toUpperCase()}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                asChild
              >
                <a href={fileValue.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                asChild
              >
                <a href={fileValue.url} download={fileValue.name}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        );
      default:
        return String(value);
    }
  };

  return (
    <dl className="grid gap-6 md:grid-cols-2">
      {fields.map((field) => (
        <div
          key={field.id}
          className={
            field.fieldType === "TEXTAREA" || field.fieldType === "RELATIONSHIP" || field.fieldType === "FILE"
              ? "md:col-span-2"
              : ""
          }
        >
          <dt className="text-sm font-medium text-muted-foreground mb-1">
            {field.fieldName}
          </dt>
          <dd className="text-sm">
            {formatValue(data[field.fieldKey], field)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
