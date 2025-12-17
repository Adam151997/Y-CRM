import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, FileInput, Eye, Send, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface PageProps {
  searchParams: Promise<{ 
    page?: string;
  }>;
}

export default async function FormsPage({ searchParams }: PageProps) {
  const { orgId } = await getAuthContext();
  const params = await searchParams;
  
  const page = parseInt(params.page || "1");
  const limit = 20;
  const skip = (page - 1) * limit;

  const [forms, total] = await Promise.all([
    prisma.form.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        _count: {
          select: { formSubmissions: true },
        },
      },
    }),
    prisma.form.count({ where: { orgId } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Get totals
  const totalSubmissions = forms.reduce((sum, form) => sum + form.submissions, 0);
  const totalViews = forms.reduce((sum, form) => sum + form.views, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Forms</h1>
          <p className="text-muted-foreground">
            Create lead capture forms for your website
          </p>
        </div>
        <Button asChild>
          <Link href="/marketing/forms/new">
            <Plus className="h-4 w-4 mr-2" />
            New Form
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Forms</CardDescription>
            <CardTitle className="text-3xl">{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Views</CardDescription>
            <CardTitle className="text-3xl">{totalViews.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Submissions</CardDescription>
            <CardTitle className="text-3xl">{totalSubmissions.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Conversion</CardDescription>
            <CardTitle className="text-3xl">
              {totalViews > 0 ? ((totalSubmissions / totalViews) * 100).toFixed(1) : 0}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Forms List */}
      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileInput className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No forms found</h3>
            <p className="text-muted-foreground mb-4">
              Create forms to capture leads from your website
            </p>
            <Button asChild>
              <Link href="/marketing/forms/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Form
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {forms.map((form) => {
            const fields = form.fields as Array<Record<string, unknown>> | null;
            const conversionRate = form.views > 0 
              ? ((form.submissions / form.views) * 100).toFixed(1) 
              : 0;
            
            return (
              <Card key={form.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <Link href={`/marketing/forms/${form.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <FileInput className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{form.name}</h3>
                          <Badge variant={form.isActive ? "default" : "secondary"}>
                            {form.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          {form.description && (
                            <span className="truncate max-w-md">{form.description}</span>
                          )}
                          {fields && (
                            <span>{fields.length} fields</span>
                          )}
                          <span>Created: {format(new Date(form.createdAt), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <div className="flex items-center gap-1 font-medium">
                            <Eye className="h-3 w-3" />
                            {form.views.toLocaleString()}
                          </div>
                          <div className="text-muted-foreground">Views</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1 font-medium">
                            <Send className="h-3 w-3" />
                            {form.submissions.toLocaleString()}
                          </div>
                          <div className="text-muted-foreground">Submissions</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium">{conversionRate}%</div>
                          <div className="text-muted-foreground">Conversion</div>
                        </div>
                      </div>
                    </Link>
                    {form.slug && (
                      <Button variant="ghost" size="icon" asChild>
                        <a href={`/f/${form.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {page > 1 && (
            <Button variant="outline" asChild>
              <Link href={`/marketing/forms?page=${page - 1}`}>
                Previous
              </Link>
            </Button>
          )}
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Button variant="outline" asChild>
              <Link href={`/marketing/forms?page=${page + 1}`}>
                Next
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
