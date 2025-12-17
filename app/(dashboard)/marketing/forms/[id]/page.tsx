import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { 
  ArrowLeft, 
  ExternalLink,
  FileInput,
  Eye,
  Send,
  Code,
} from "lucide-react";
import { format } from "date-fns";
import { FormActions } from "./_components/form-actions";

interface PageProps {
  params: Promise<{ id: string }>;
}

const fieldTypeLabels: Record<string, string> = {
  text: "Text",
  email: "Email",
  phone: "Phone",
  textarea: "Text Area",
  select: "Dropdown",
  checkbox: "Checkbox",
  radio: "Radio",
  number: "Number",
  date: "Date",
};

export default async function FormDetailPage({ params }: PageProps) {
  const { orgId } = await getAuthContext();
  const { id } = await params;

  const form = await prisma.form.findFirst({
    where: { id, orgId },
    include: {
      formSubmissions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      _count: {
        select: { formSubmissions: true },
      },
    },
  });

  if (!form) {
    notFound();
  }

  const fields = form.fields as Array<{ id: string; type: string; label: string; required: boolean; placeholder?: string }> | null;
  const conversionRate = form.views > 0 
    ? ((form.submissions / form.views) * 100).toFixed(1) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/marketing/forms">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Forms
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-blue-100">
            <FileInput className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{form.name}</h1>
              <Badge variant={form.isActive ? "default" : "secondary"}>
                {form.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            {form.description && (
              <p className="text-muted-foreground mt-1">{form.description}</p>
            )}
            {form.slug && (
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-mono">/f/{form.slug}</span>
              </p>
            )}
          </div>
        </div>
        <FormActions form={form} />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Views</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Eye className="h-5 w-5 text-muted-foreground" />
              {form.views.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Submissions</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Send className="h-5 w-5 text-muted-foreground" />
              {form.submissions.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conversion Rate</CardDescription>
            <CardTitle className="text-3xl">{conversionRate}%</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fields</CardDescription>
            <CardTitle className="text-3xl">{fields?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Form Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Form Fields</CardTitle>
              <CardDescription>
                Preview of the form structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              {fields && fields.length > 0 ? (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id || index} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{field.label}</span>
                          {field.required && (
                            <Badge variant="outline" className="text-xs">Required</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Type: {fieldTypeLabels[field.type] || field.type}
                          {field.placeholder && ` • Placeholder: "${field.placeholder}"`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No fields defined</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Submissions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Submissions</CardTitle>
              <CardDescription>
                Last {form.formSubmissions.length} submissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {form.formSubmissions.length > 0 ? (
                <div className="space-y-3">
                  {form.formSubmissions.map((submission) => {
                    const data = submission.data as Record<string, unknown>;
                    return (
                      <div 
                        key={submission.id} 
                        className="p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(submission.createdAt), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                          {submission.leadId && (
                            <Badge variant="outline" className="text-xs">
                              Lead created
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm space-y-1">
                          {Object.entries(data).slice(0, 3).map(([key, value]) => (
                            <div key={key}>
                              <span className="text-muted-foreground">{key}:</span>{" "}
                              <span className="font-medium">{String(value)}</span>
                            </div>
                          ))}
                          {Object.keys(data).length > 3 && (
                            <span className="text-muted-foreground text-xs">
                              +{Object.keys(data).length - 3} more fields
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">No submissions yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">Status</span>
                <p className="font-medium">{form.isActive ? "Active" : "Inactive"}</p>
              </div>
              <Separator />
              <div>
                <span className="text-sm text-muted-foreground">Creates Lead</span>
                <p className="font-medium">{form.createLead ? "Yes" : "No"}</p>
              </div>
              <Separator />
              <div>
                <span className="text-sm text-muted-foreground">Lead Source</span>
                <p className="font-medium">{form.leadSource}</p>
              </div>
              <Separator />
              <div>
                <span className="text-sm text-muted-foreground">Created</span>
                <p className="font-medium">
                  {format(new Date(form.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {form.slug && (
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`/f/${form.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Preview Form
                  </a>
                </Button>
              )}
              <p className="text-xs text-muted-foreground text-center pt-2">
                Use the menu above for embed code and more options
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
