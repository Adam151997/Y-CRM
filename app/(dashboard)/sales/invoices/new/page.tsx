"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { InvoiceForm } from "../_components/invoice-form";

interface Account {
  id: string;
  name: string;
  contacts?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  }[];
}

function NewInvoiceContent() {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const defaultAccountId = searchParams.get("accountId") || undefined;

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await fetch("/api/accounts?limit=100");
        if (response.ok) {
          const data = await response.json();
          // Fetch contacts for each account
          const accountsWithContacts = await Promise.all(
            data.accounts.map(async (account: Account) => {
              const contactsRes = await fetch(`/api/contacts?accountId=${account.id}&limit=50`);
              if (contactsRes.ok) {
                const contactsData = await contactsRes.json();
                return { ...account, contacts: contactsData.contacts || [] };
              }
              return account;
            })
          );
          setAccounts(accountsWithContacts);
        }
      } catch (error) {
        console.error("Error fetching accounts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAccounts();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/sales/invoices">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Invoice</h1>
          <p className="text-muted-foreground">
            Create a new invoice for a customer
          </p>
        </div>
      </div>

      {/* Form */}
      <InvoiceForm accounts={accounts} defaultAccountId={defaultAccountId} />
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <NewInvoiceContent />
    </Suspense>
  );
}
