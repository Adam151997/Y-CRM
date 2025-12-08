import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { 
  Building2, 
  Search, 
  HeartPulse,
  Ticket,
  RefreshCw,
} from "lucide-react";

interface PageProps {
  searchParams: Promise<{
    query?: string;
  }>;
}

const riskLevelColors: Record<string, string> = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

export default async function CSAccountsPage({ searchParams }: PageProps) {
  const { orgId } = await getAuthContext();
  const params = await searchParams;
  const searchQuery = params.query;

  // Build where clause
  const where: Record<string, unknown> = { orgId };
  if (searchQuery) {
    where.name = { contains: searchQuery, mode: "insensitive" };
  }

  // Fetch accounts with CS-relevant data
  const accounts = await prisma.account.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      health: true,
      _count: {
        select: {
          tickets: true,
          renewals: true,
          contacts: true,
        },
      },
      tickets: {
        where: { status: { in: ["NEW", "OPEN", "PENDING"] } },
        select: { id: true },
      },
      renewals: {
        where: { status: { in: ["UPCOMING", "IN_PROGRESS"] } },
        orderBy: { endDate: "asc" },
        take: 1,
        select: { endDate: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Customer Accounts</h1>
        <p className="text-muted-foreground">
          Manage and monitor your customer portfolio
        </p>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <form className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  name="query"
                  placeholder="Search accounts..."
                  defaultValue={searchQuery}
                  className="pl-9"
                />
              </div>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">No accounts found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "Try a different search term" : "No customer accounts yet"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Open Tickets</TableHead>
                  <TableHead>Next Renewal</TableHead>
                  <TableHead>Contacts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => {
                  const openTickets = account.tickets.length;
                  const nextRenewal = account.renewals[0];

                  return (
                    <TableRow key={account.id}>
                      <TableCell>
                        <Link
                          href={`/cs/accounts/${account.id}`}
                          className="font-medium hover:underline flex items-center gap-2"
                        >
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {account.name}
                        </Link>
                        {account.type && (
                          <p className="text-xs text-muted-foreground ml-6">
                            {account.type}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {account.health ? (
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={riskLevelColors[account.health.riskLevel]}
                            >
                              <HeartPulse className="h-3 w-3 mr-1" />
                              {account.health.score}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not tracked</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {openTickets > 0 ? (
                          <Link
                            href={`/cs/tickets?accountId=${account.id}`}
                            className="hover:underline"
                          >
                            <Badge variant="secondary">
                              <Ticket className="h-3 w-3 mr-1" />
                              {openTickets}
                            </Badge>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {nextRenewal ? (
                          <div className="flex items-center gap-1 text-sm">
                            <RefreshCw className="h-3 w-3 text-muted-foreground" />
                            {new Date(nextRenewal.endDate).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {account._count.contacts}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
