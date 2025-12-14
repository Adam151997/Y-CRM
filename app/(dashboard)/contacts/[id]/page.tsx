import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  Building2,
  Calendar,
  Star,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { ContactNotes } from "./_components/contact-notes";
import { ContactTasks } from "./_components/contact-tasks";
import { ContactActivity } from "./_components/contact-activity";
import { AssigneeDisplay } from "@/components/forms/assignee-selector";
import { CustomFieldsDisplay } from "@/components/forms/custom-fields-renderer";

interface ContactPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { orgId, userId } = await getAuthContext();
  const { id } = await params;

  const contact = await prisma.contact.findFirst({
    where: { id, orgId },
    include: {
      account: true,
      notes: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      tasks: {
        orderBy: { dueDate: "asc" },
      },
      activities: {
        orderBy: { performedAt: "desc" },
        take: 20,
      },
    },
  });

  if (!contact) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contacts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {contact.firstName[0]}
              {contact.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">
                {contact.firstName} {contact.lastName}
              </h2>
              {contact.isPrimary && (
                <Badge variant="secondary" className="gap-1">
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  Primary
                </Badge>
              )}
            </div>
            {contact.title && (
              <p className="text-muted-foreground">
                {contact.title}
                {contact.department && ` · ${contact.department}`}
              </p>
            )}
          </div>
        </div>
        <Button asChild>
          <Link href={`/contacts/${id}/edit`}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-sm hover:underline"
                  >
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-sm hover:underline"
                  >
                    {contact.phone}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Added {format(new Date(contact.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Assigned To</span>
                <AssigneeDisplay assigneeId={contact.assignedToId} />
              </div>
            </CardContent>
          </Card>

          {/* Custom Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Additional Information</CardTitle>
            </CardHeader>
            <CardContent>
              <CustomFieldsDisplay
                module="CONTACT"
                values={(contact.customFields as Record<string, unknown>) || {}}
              />
            </CardContent>
          </Card>

          {/* Account Info */}
          {contact.account && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Account</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/accounts/${contact.account.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{contact.account.name}</p>
                    {contact.account.industry && (
                      <p className="text-sm text-muted-foreground">
                        {contact.account.industry}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="notes">
            <TabsList>
              <TabsTrigger value="notes">
                Notes ({contact.notes.length})
              </TabsTrigger>
              <TabsTrigger value="tasks">
                Tasks ({contact.tasks.length})
              </TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="notes" className="mt-4">
              <ContactNotes
                contactId={contact.id}
                notes={contact.notes}
                userId={userId}
              />
            </TabsContent>
            <TabsContent value="tasks" className="mt-4">
              <ContactTasks
                contactId={contact.id}
                tasks={contact.tasks}
                userId={userId}
              />
            </TabsContent>
            <TabsContent value="activity" className="mt-4">
              <ContactActivity activities={contact.activities} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
