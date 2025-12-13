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
} from "lucide-react";
import { AccountContacts } from "./_components/account-contacts";
import { AccountOpportunities } from "./_components/account-opportunities";
import { AccountNotes } from "./_components/account-notes";
import { AccountTasks } from "./_components/account-tasks";
import { AccountActions } from "./_components/account-actions";
import { AccountRenewals } from "./_components/account-renewals";

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
      _count: {
        select: { contacts: true, opportunities: true, notes: true, tasks: true, renewals: true },
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{account._count.contacts}</p>
                <p className="text-sm text-muted-foreground">Contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Target className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{account._count.opportunities}</p>
                <p className="text-sm text-muted-foreground">Opportunities</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatRevenue(totalOpportunityValue)}</p>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatRevenue(account.annualRevenue)}</p>
                <p className="text-sm text-muted-foreground">Annual Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList>
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
        </TabsList>

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
      </Tabs>
    </div>
  );
}
