import { getTranslations } from "next-intl/server";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, UsersRound, Users, UserPlus, Zap, Filter } from "lucide-react";
import { format } from "date-fns";

interface PageProps {
  searchParams: Promise<{ 
    type?: string;
    page?: string;
  }>;
}

export default async function SegmentsPage({ searchParams }: PageProps) {
  const { orgId } = await getAuthContext();
  const t = await getTranslations("modules.segments");
  const params = await searchParams;
  
  const type = params.type;
  const page = parseInt(params.page || "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = { orgId };
  if (type && type !== "_all") where.type = type;

  const [segments, total] = await Promise.all([
    prisma.segment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        _count: {
          select: { campaigns: true },
        },
      },
    }),
    prisma.segment.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Get total members across all segments
  const totalMembers = segments.reduce((sum, seg) => sum + seg.memberCount, 0);

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
          <Link href="/marketing/segments/new">
            <Plus className="h-4 w-4 mr-2" />
            {t("addSegment")}
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Segments</CardDescription>
            <CardTitle className="text-3xl">{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Members</CardDescription>
            <CardTitle className="text-3xl">{totalMembers.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Campaigns</CardDescription>
            <CardTitle className="text-3xl">
              {segments.reduce((sum, seg) => sum + seg._count.campaigns, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Type:</span>
            <div className="flex gap-1">
              {["_all", "DYNAMIC", "STATIC"].map((t) => (
                <Link
                  key={t}
                  href={`/marketing/segments?type=${t}`}
                >
                  <Badge
                    variant={type === t || (!type && t === "_all") ? "default" : "outline"}
                    className="cursor-pointer"
                  >
                    {t === "_all" ? "All" : t}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Segments List */}
      {segments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UsersRound className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No segments found</h3>
            <p className="text-muted-foreground mb-4">
              Create segments to target specific audiences
            </p>
            <Button asChild>
              <Link href="/marketing/segments/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Segment
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {segments.map((segment) => {
            const rules = segment.rules as Array<Record<string, unknown>> | null;
            
            return (
              <Link key={segment.id} href={`/marketing/segments/${segment.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${segment.type === "DYNAMIC" ? "bg-purple-100" : "bg-blue-100"}`}>
                        {segment.type === "DYNAMIC" ? (
                          <Zap className="h-5 w-5 text-purple-600" />
                        ) : segment.targetEntity === "LEAD" ? (
                          <UserPlus className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Users className="h-5 w-5 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{segment.name}</h3>
                          <Badge variant={segment.isActive ? "default" : "secondary"}>
                            {segment.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">{segment.type}</Badge>
                          <Badge variant={segment.targetEntity === "LEAD" ? "secondary" : "outline"} className="text-xs">
                            {segment.targetEntity === "LEAD" ? "Leads" : "Contacts"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {segment.description && (
                            <span className="truncate max-w-md">{segment.description}</span>
                          )}
                          {rules && rules.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Filter className="h-3 w-3" />
                              {rules.length} rule{rules.length !== 1 ? "s" : ""}
                            </span>
                          )}
                          <span>Created: {format(new Date(segment.createdAt), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="font-medium text-lg">{segment.memberCount.toLocaleString()}</div>
                          <div className="text-muted-foreground">Members</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-lg">{segment._count.campaigns}</div>
                          <div className="text-muted-foreground">Campaigns</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Button variant="outline" asChild>
              <Link href={`/marketing/segments?page=${page - 1}${type ? `&type=${type}` : ""}`}>
                Previous
              </Link>
            </Button>
          )}
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Button variant="outline" asChild>
              <Link href={`/marketing/segments?page=${page + 1}${type ? `&type=${type}` : ""}`}>
                Next
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
