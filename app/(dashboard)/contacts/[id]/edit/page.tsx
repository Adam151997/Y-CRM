import Link from "next/link";
import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ContactForm } from "@/components/forms/contact-form";

interface EditContactPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditContactPage({ params }: EditContactPageProps) {
  const { orgId } = await getAuthContext();
  const { id } = await params;

  const [contact, accounts] = await Promise.all([
    prisma.contact.findFirst({
      where: { id, orgId },
    }),
    prisma.account.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!contact) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/contacts/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit Contact</h2>
          <p className="text-muted-foreground">
            {contact.firstName} {contact.lastName}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <ContactForm
          accounts={accounts}
          initialData={{
            id: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email || "",
            phone: contact.phone || "",
            title: contact.title || "",
            department: contact.department || "",
            accountId: contact.accountId || "",
            isPrimary: contact.isPrimary,
          }}
          mode="edit"
        />
      </div>
    </div>
  );
}
