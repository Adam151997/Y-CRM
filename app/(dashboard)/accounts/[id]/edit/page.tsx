import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { AccountForm } from "@/components/forms";

interface EditAccountPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAccountPage({ params }: EditAccountPageProps) {
  const { orgId } = await getAuthContext();
  const { id } = await params;

  const account = await prisma.account.findFirst({
    where: { id, orgId },
  });

  if (!account) {
    notFound();
  }

  // Convert Decimal to number for the form
  const formData = {
    id: account.id,
    name: account.name,
    industry: account.industry,
    website: account.website,
    phone: account.phone,
    type: account.type,
    rating: account.rating,
    annualRevenue: account.annualRevenue ? Number(account.annualRevenue) : null,
    employeeCount: account.employeeCount,
    assignedToId: account.assignedToId,
    address: account.address as {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    } | null,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Edit Account</h2>
        <p className="text-muted-foreground">Update account information</p>
      </div>

      <AccountForm 
        initialData={formData} 
        initialCustomFields={(account.customFields as Record<string, unknown>) || {}}
      />
    </div>
  );
}
