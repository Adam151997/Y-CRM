import Link from "next/link";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ContactForm } from "@/components/forms/contact-form";

export default async function NewContactPage() {
  const { orgId } = await getAuthContext();

  // Fetch accounts for the dropdown
  const accounts = await prisma.account.findMany({
    where: { orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/contacts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">New Contact</h2>
          <p className="text-muted-foreground">
            Add a new contact to your CRM
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <ContactForm accounts={accounts} mode="create" />
      </div>
    </div>
  );
}
