import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewTicketForm } from "./_components/new-ticket-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewTicketPage() {
  const { orgId } = await getAuthContext();

  // Fetch accounts and contacts for the form
  const [accounts, contacts] = await Promise.all([
    prisma.account.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.contact.findMany({
      where: { orgId },
      orderBy: { firstName: "asc" },
      select: { 
        id: true, 
        firstName: true, 
        lastName: true,
        accountId: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/cs/tickets">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tickets
        </Link>
      </Button>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Create New Ticket</CardTitle>
          <CardDescription>
            Log a new support request for a customer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewTicketForm accounts={accounts} contacts={contacts} />
        </CardContent>
      </Card>
    </div>
  );
}
