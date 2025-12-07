"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Users,
  Target,
  Globe,
  Building2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Account {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  type: string | null;
  rating: string | null;
  annualRevenue: string | number | null;
  employeeCount: number | null;
  createdAt: Date;
  _count: {
    contacts: number;
    opportunities: number;
    notes: number;
  };
}

interface AccountsTableProps {
  accounts: Account[];
  page: number;
  totalPages: number;
  total: number;
}

const typeColors: Record<string, string> = {
  PROSPECT: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  CUSTOMER: "bg-green-500/10 text-green-500 border-green-500/20",
  PARTNER: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  VENDOR: "bg-orange-500/10 text-orange-500 border-orange-500/20",
};

const ratingColors: Record<string, string> = {
  HOT: "bg-red-500/10 text-red-500 border-red-500/20",
  WARM: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  COLD: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

function formatRevenue(value: string | number | null): string {
  if (!value) return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num >= 1000000000) return `$${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}

export function AccountsTable({
  accounts,
  page,
  totalPages,
  total,
}: AccountsTableProps) {
  const router = useRouter();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete");
      }

      toast.success("Account deleted successfully");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete account");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Account</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Revenue</TableHead>
              <TableHead>Related</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <p className="text-muted-foreground">No accounts found</p>
                  <Button variant="link" asChild className="mt-2">
                    <Link href="/accounts/new">Add your first account</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              accounts.map((account) => (
                <TableRow key={account.id} className="group">
                  <TableCell>
                    <Link
                      href={`/accounts/${account.id}`}
                      className="flex items-center space-x-3 hover:underline"
                    >
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{account.name}</p>
                        {account.website && (
                          <span className="flex items-center text-xs text-muted-foreground">
                            <Globe className="h-3 w-3 mr-1" />
                            {account.website.replace(/^https?:\/\//, "")}
                          </span>
                        )}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {account.industry && (
                      <span className="text-sm">{account.industry}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {account.type && (
                      <Badge variant="outline" className={typeColors[account.type] || ""}>
                        {account.type}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {account.rating && (
                      <Badge variant="outline" className={ratingColors[account.rating] || ""}>
                        {account.rating}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {formatRevenue(account.annualRevenue)}
                    </span>
                    {account.employeeCount && (
                      <p className="text-xs text-muted-foreground">
                        {account.employeeCount.toLocaleString()} employees
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center text-xs" title="Contacts">
                        <Users className="h-3 w-3 mr-1" />
                        {account._count.contacts}
                      </span>
                      <span className="flex items-center text-xs" title="Opportunities">
                        <Target className="h-3 w-3 mr-1" />
                        {account._count.opportunities}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(account.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/accounts/${account.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/accounts/${account.id}/edit`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(account.id, account.name)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} accounts
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => router.push(`/accounts?page=${page - 1}`)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => router.push(`/accounts?page=${page + 1}`)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
