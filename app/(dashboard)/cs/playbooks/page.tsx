import { getTranslations } from "next-intl/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  Plus, 
  BookOpen, 
  Play,
  Pause,
  CheckCircle,
  Clock,
  Users,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const triggerLabels: Record<string, string> = {
  MANUAL: "Manual",
  NEW_CUSTOMER: "New Customer",
  RENEWAL_APPROACHING: "Renewal Approaching",
  HEALTH_DROP: "Health Drop",
  TICKET_ESCALATION: "Ticket Escalation",
};

const triggerIcons: Record<string, React.ReactNode> = {
  MANUAL: <Play className="h-4 w-4" />,
  NEW_CUSTOMER: <Users className="h-4 w-4" />,
  RENEWAL_APPROACHING: <Clock className="h-4 w-4" />,
  HEALTH_DROP: <Zap className="h-4 w-4" />,
  TICKET_ESCALATION: <Zap className="h-4 w-4" />,
};

export default async function PlaybooksPage() {
  const { orgId } = await getAuthContext();
  const t = await getTranslations("modules.playbooks");

  // Fetch playbooks with run counts
  const playbooks = await prisma.playbook.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { 
        select: { 
          runs: true,
        } 
      },
      runs: {
        where: { status: "IN_PROGRESS" },
        select: { id: true },
      },
    },
  });

  // Calculate stats
  const stats = {
    total: playbooks.length,
    active: playbooks.filter(p => p.isActive).length,
    automated: playbooks.filter(p => p.trigger !== "MANUAL").length,
    runningNow: playbooks.reduce((sum, p) => sum + p.runs.length, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <Button asChild>
          <Link href="/cs/playbooks/new">
            <Plus className="h-4 w-4 mr-2" />
            {t("addPlaybook")}
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Playbooks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Automated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.automated}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Running Now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-600">{stats.runningNow}</div>
          </CardContent>
        </Card>
      </div>

      {/* Playbooks Grid */}
      {playbooks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-1">No playbooks yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first playbook to standardize customer success workflows
            </p>
            <Button asChild>
              <Link href="/cs/playbooks/new">Create Playbook</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {playbooks.map((playbook) => {
            const steps = Array.isArray(playbook.steps) ? playbook.steps : [];
            const activeRuns = playbook.runs.length;
            
            return (
              <Card key={playbook.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        <Link 
                          href={`/cs/playbooks/${playbook.id}`}
                          className="hover:underline"
                        >
                          {playbook.name}
                        </Link>
                      </CardTitle>
                      {playbook.description && (
                        <CardDescription className="line-clamp-2 mt-1">
                          {playbook.description}
                        </CardDescription>
                      )}
                    </div>
                    <Badge variant={playbook.isActive ? "default" : "secondary"}>
                      {playbook.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Trigger */}
                    <div className="flex items-center gap-2 text-sm">
                      {triggerIcons[playbook.trigger]}
                      <span className="text-muted-foreground">Trigger:</span>
                      <span>{triggerLabels[playbook.trigger] || playbook.trigger}</span>
                    </div>

                    {/* Steps count */}
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-muted-foreground">Steps:</span>
                      <span>{steps.length}</span>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="text-sm text-muted-foreground">
                        {playbook._count.runs} total runs
                      </div>
                      {activeRuns > 0 && (
                        <Badge variant="outline" className="text-blue-600">
                          <Play className="h-3 w-3 mr-1" />
                          {activeRuns} running
                        </Badge>
                      )}
                    </div>

                    {/* Created */}
                    <div className="text-xs text-muted-foreground">
                      Created {formatDistanceToNow(new Date(playbook.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
