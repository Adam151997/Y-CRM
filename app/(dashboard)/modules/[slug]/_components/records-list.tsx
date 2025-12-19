"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RelationshipDisplay } from "@/components/forms/relationship-field-input";
import { toast } from "sonner";
import {
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Paperclip,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Field {
  id: string;
  fieldName: string;
  fieldKey: string;
  fieldType: string;
  isSystem: boolean;
  relatedModule?: string | null;
}

interface Module {
  id: string;
  name: string;
  pluralName: string;
  slug: string;
  labelField: string;
  fields: Field[];
}

interface ModuleRecord {
  id: string;
  data: unknown;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface RecordsListProps {
  module: Module;
  records: ModuleRecord[];
  total: number;
  page: number;
  limit: number;
  query?: string;
}

export function RecordsList({
  module,
  records,
  total,
  page,
  limit,
  query: initialQuery,
}: RecordsListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialQuery || "");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<ModuleRecord | null>(null);

  const totalPages = Math.ceil(total / limit);

  // Get display columns (first 4 non-system fields or all if less than 4)
  const displayFields = module.fields.slice(0, 4);

  // Handle search
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("query", searchQuery);
    router.push(`/modules/${module.slug}?${params.toString()}`);
  };

  // Handle pagination
  const goToPage = (newPage: number) => {
    const params = new URLSearchParams();
    params.set("page", String(newPage));
    if (searchQuery) params.set("query", searchQuery);
    router.push(`/modules/${module.slug}?${params.toString()}`);
  };

  // Handle delete
  const handleDelete = async () => {
    if (!recordToDelete) return;

    try {
      const response = await fetch(
        `/api/modules/${module.slug}/records/${recordToDelete.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success(`${module.name} deleted`);
        setDeleteDialogOpen(false);
        setRecordToDelete(null);
        router.refresh();
      } else {
        toast.error("Failed to delete record");
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      toast.error("Failed to delete record");
    }
  };

  // Format field value for display
  const formatValue = (value: unknown, field: Field): React.ReactNode => {
    if (value === null || value === undefined) return "-";

    switch (field.fieldType) {
      case "BOOLEAN":
        return value ? "Yes" : "No";
      case "DATE":
        return new Date(String(value)).toLocaleDateString();
      case "CURRENCY":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(Number(value));
      case "PERCENT":
        return `${value}%`;
      case "MULTISELECT":
        return Array.isArray(value) ? value.join(", ") : String(value);
      case "RELATIONSHIP":
        if (!field.relatedModule) return String(value);
        return (
          <RelationshipDisplay
            relatedModule={field.relatedModule}
            value={String(value)}
            showLink={true}
          />
        );
      case "FILE":
        const fileValue = value as { url?: string; name?: string } | null;
        if (!fileValue?.name) return "-";
        return (
          <div className="flex items-center gap-1.5">
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="truncate max-w-[150px]" title={fileValue.name}>
              {fileValue.name}
            </span>
          </div>
        );
      default:
        return String(value);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{module.pluralName}</CardTitle>
            <CardDescription>
              {total} {total === 1 ? "record" : "records"} total
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder={`Search ${module.pluralName.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-64"
            />
            <Button variant="outline" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-1">No {module.pluralName.toLowerCase()}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {initialQuery
                ? `No results found for "${initialQuery}"`
                : `Get started by creating your first ${module.name.toLowerCase()}.`}
            </p>
            {!initialQuery && (
              <Link href={`/modules/${module.slug}/new`}>
                <Button>Create {module.name}</Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  {displayFields.map((field) => (
                    <TableHead key={field.id}>{field.fieldName}</TableHead>
                  ))}
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const data = record.data as Record<string, unknown>;

                  return (
                    <TableRow key={record.id}>
                      {displayFields.map((field, idx) => (
                        <TableCell key={field.id}>
                          {idx === 0 ? (
                            <Link
                              href={`/modules/${module.slug}/${record.id}`}
                              className="font-medium hover:underline"
                            >
                              {field.fieldType === "RELATIONSHIP" ? (
                                formatValue(data[field.fieldKey], field)
                              ) : (
                                String(data[field.fieldKey] || "Untitled")
                              )}
                            </Link>
                          ) : (
                            formatValue(data[field.fieldKey], field)
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(record.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/modules/${module.slug}/${record.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/modules/${module.slug}/${record.id}/edit`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setRecordToDelete(record);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => goToPage(page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {module.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this {module.name.toLowerCase()}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
