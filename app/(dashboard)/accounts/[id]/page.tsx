import { notFound } from "next/navigation";
import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pencil,
  Globe,
  Phone,
  MapPin,
  Building2,
  Users,
  Target,
  DollarSign,
  TrendingUp,
  Activity,
  FileText,
  Receipt,
  HeartPulse,
  Ticket,
} from "lucide-react";
import { AccountContacts } from "./_components/account-contacts";
import { AccountOpportunities } from "./_components/account-opportunities";
import { AccountNotes } from "./_components/account-notes";
import { AccountTasks } from "./_components/account-tasks";
import { AccountActions } from "./_components/account-actions";
import { AccountRenewals } from "./_components/account-renewals";
import { AccountDocuments } from "./_components/account-documents";
import { AccountInvoices } from "./_components/account-invoices";
import { AccountTickets } from "./_components/account-tickets";
import { RecordTimeline } from "@/components/shared/record-timeline";
import { AssigneeDisplay } from "@/components/forms/assignee-selector";
import { CustomFieldsDisplay } from "@/components/forms/custom-fields-renderer";

interface AccountDetailPageProps {
  params: Promise<{ id: string }>;
}

const typeColors: Record<string, string> = {
  PROSPECT: "bg-blue-500/10 text-blue-500",
  CUSTOMER: "bg-green-500/10 text-green-500",
  PARTNER: "bg-purple-500/10 text-purple-500",
  VENDOR: "bg-orange-500/10 text-orange-500",
};

const ratingColors: Record<string, string> = {
  HOT: "bg-red-500/10 text-red-500",
  WARM: "bg-yellow-500/10 text-yellow-500",
  COLD: "bg-slate-500/10 text-slate-500",
};

function formatRevenue(value: unknown): string {
  if (!value) return "-";
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
  const { orgId } = await getAuthContext();
  const { id } = await params;

  const account = await prisma.account.findFirst({
    where: { id, orgId },
    include: {
      contacts: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        take: 10,
      },
      opportunities: {
        orderBy: { createdAt: "desc" },
        include: { stage: true },
        take: 10,
      },
      notes: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      tasks: {
        orderBy: { dueDate: "asc" },
        where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
        take: 5,
      },
      renewals: {
        orderBy: { endDate: "asc" },
        take: 10,
      },
      activities: {
        orderBy: { performedAt: "desc" },
        take: 20,
      },
      documents: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      invoices: {
        orderBy: { issueDate: "desc" },
        include: {
          contact: { select: { firstName: true, lastName: true } },
        },
        take: 20,
      },
      tickets: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      health: true,
      _count: {
        select: { contacts: true, opportunities: true, notes: true, tasks: true, renewals: true, activities: true, documents: true, invoices: true, tickets: true },
      },
    },
  });

  if (!account) {
    notFound();
  }

  const address = account.address as {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;

  const addressString = address
    ? [address.street, address.city, address.state, address.zip, address.country]
        .filter(Boolean)
        .join(", ")
    : null;

  // Calculate total opportunity value
  const totalOpportunityValue = account.opportunities.reduce(
    (sum, opp) => sum + Number(opp.value),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">{account.name}</h2>
              {account.type && (
                <Badge className={typeColors[account.type]}>{account.type}</Badge>
              )}
              {account.rating && (
                <Badge className={ratingColors[account.rating]}>{account.rating}</Badge>
              )}
            </div>
            {account.industry && (
              <p className="text-muted-foreground">{account.industry}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              {account.website && (
                <a
                  href={account.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center hover:text-primary"
                >
                  <Globe className="h-4 w-4 mr-1" />
                  {account.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              {account.phone && (
                <span className="flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  {account.phone}
                </span>
              )}
              {addressString && (
                <span className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {addressString}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AccountActions accountId={account.id} accountName={account.name} />
          <Button asChild>
            <Link href={`/accounts/${account.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards & Account Details */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Stats Cards - 3 columns */}
        <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold truncate">{account._count.contacts}</p>
                  <p className="text-sm text-muted-foreground">Contacts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10 flex-shrink-0">
                  <Target className="h-5 w-5 text-green-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold truncate">{account._count.opportunities}</p>
                  <p className="text-sm text-muted-foreground">Opportunities</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 flex-shrink-0">
                  <DollarSign className="h-5 w-5 text-purple-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold truncate" title={formatRevenue(totalOpportunityValue)}>
                    {formatRevenue(totalOpportunityValue)}
                  </p>
                  <p className="text-sm text-muted-foreground">Pipeline Value</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10 flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold truncate" title={formatRevenue(account.annualRevenue)}>
                    {formatRevenue(account.annualRevenue)}
                  </p>
                  <p className="text-sm text-muted-foreground">Annual Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Details - 1 column */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Owner</span>
                <AssigneeDisplay assigneeId={account.assignedToId} />
              </div>
            </CardContent>
          </Card>

          {/* Health Score Card */}
          {account.health ? (
            <Link href={`/cs/health/${account.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <HeartPulse className="h-4 w-4" />
                    Health Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-bold">{account.health.score}</span>
                      <span className="text-muted-foreground">/100</span>
                    </div>
                    <Badge
                      className={
                        account.health.riskLevel === "LOW"
                          ? "bg-green-500/10 text-green-500"
                          : account.health.riskLevel === "MEDIUM"
                          ? "bg-yellow-500/10 text-yellow-500"
                          : account.health.riskLevel === "HIGH"
                          ? "bg-orange-500/10 text-orange-500"
                          : "bg-red-500/10 text-red-500"
                      }
                    >
                      {account.health.riskLevel}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <HeartPulse className="h-4 w-4" />
                  Health Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">No health data yet</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Company Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {account.employeeCount && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Employees</span>
                  <span className="font-medium">{account.employeeCount.toLocaleString()}</span>
                </div>
              )}
              <CustomFieldsDisplay
                module="ACCOUNT"
                values={(account.customFields as Record<string, unknown>) || {}}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline" className="gap-2">
            <Activity className="h-4 w-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="contacts">
            Contacts ({account._count.contacts})
          </TabsTrigger>
          <TabsTrigger value="opportunities">
            Opportunities ({account._count.opportunities})
          </TabsTrigger>
          <TabsTrigger value="renewals">
            Renewals ({account._count.renewals})
          </TabsTrigger>
          <TabsTrigger value="notes">
            Notes ({account._count.notes})
          </TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks ({account._count.tasks})
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents ({account._count.documents})
          </TabsTrigger>
          <TabsTrigger value="invoices">
            Invoices ({account._count.invoices})
          </TabsTrigger>
          <TabsTrigger value="tickets">
            Tickets ({account._count.tickets})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <RecordTimeline
            activities={account.activities}
            emptyMessage="No activity yet for this account"
          />
        </TabsContent>

        <TabsContent value="contacts">
          <AccountContacts contacts={account.contacts} accountId={account.id} />
        </TabsContent>

        <TabsContent value="opportunities">
          <AccountOpportunities
            opportunities={account.opportunities}
            accountId={account.id}
          />
        </TabsContent>

        <TabsContent value="renewals">
          <AccountRenewals
            renewals={account.renewals.map(r => ({
              ...r,
              contractValue: Number(r.contractValue),
              startDate: r.startDate.toISOString(),
              endDate: r.endDate.toISOString(),
            }))}
            accountId={account.id}
          />
        </TabsContent>

        <TabsContent value="notes">
          <AccountNotes accountId={account.id} initialNotes={account.notes} />
        </TabsContent>

        <TabsContent value="tasks">
          <AccountTasks accountId={account.id} initialTasks={account.tasks} />
        </TabsContent>

        <TabsContent value="documents">
          <AccountDocuments documents={account.documents} accountId={account.id} />
        </TabsContent>

        <TabsContent value="invoices">
          <AccountInvoices invoices={account.invoices} accountId={account.id} />
        </TabsContent>

        <TabsContent value="tickets">
          <AccountTickets tickets={account.tickets} accountId={account.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
