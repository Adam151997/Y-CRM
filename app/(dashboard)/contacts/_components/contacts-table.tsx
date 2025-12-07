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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Mail,
  Phone,
  Building2,
  MessageSquare,
  CheckSquare,
  Star,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  department: string | null;
  isPrimary: boolean;
  createdAt: Date;
  account: {
    id: string;
    name: string;
  } | null;
  _count: {
    notes: number;
    tasks: number;
  };
}

interface ContactsTableProps {
  contacts: Contact[];
  page: number;
  totalPages: number;
  total: number;
}

export function ContactsTable({
  contacts,
  page,
  totalPages,
  total,
}: ContactsTableProps) {
  const router = useRouter();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const response = await fetch(`/api/contacts/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast.success("Contact deleted successfully");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete contact");
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Contact</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <p className="text-muted-foreground">No contacts found</p>
                  <Button variant="link" asChild className="mt-2">
                    <Link href="/contacts/new">Add your first contact</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id} className="group">
                  <TableCell>
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="flex items-center space-x-3 hover:underline"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {contact.firstName[0]}
                          {contact.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {contact.firstName} {contact.lastName}
                          </p>
                          {contact.isPrimary && (
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          )}
                        </div>
                        {contact.email && (
                          <p className="text-xs text-muted-foreground flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {contact.email}
                          </p>
                        )}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {contact.account && (
                      <Link
                        href={`/accounts/${contact.account.id}`}
                        className="flex items-center hover:underline"
                      >
                        <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                        {contact.account.name}
                      </Link>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.title && (
                      <div>
                        <p className="text-sm">{contact.title}</p>
                        {contact.department && (
                          <p className="text-xs text-muted-foreground">
                            {contact.department}
                          </p>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.phone && (
                      <span className="flex items-center text-sm">
                        <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                        {contact.phone}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <span className="flex items-center text-xs">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {contact._count.notes}
                      </span>
                      <span className="flex items-center text-xs">
                        <CheckSquare className="h-3 w-3 mr-1" />
                        {contact._count.tasks}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(contact.createdAt), {
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
                          <Link href={`/contacts/${contact.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/contacts/${contact.id}/edit`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() =>
                            handleDelete(
                              contact.id,
                              `${contact.firstName} ${contact.lastName}`
                            )
                          }
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
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of{" "}
            {total} contacts
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => router.push(`/contacts?page=${page - 1}`)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => router.push(`/contacts?page=${page + 1}`)}
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
