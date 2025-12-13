"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";

// Form schema
const formSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  contactId: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  currency: z.string().default("USD"),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
  discountValue: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(z.object({
    id: z.string().optional(),
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
    unitPrice: z.coerce.number().min(0, "Price must be 0 or greater"),
    itemCode: z.string().optional(),
  })).min(1, "At least one item is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditInvoicePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accounts, setAccounts] = useState<{ id: string; name: string; contacts?: { id: string; firstName: string; lastName: string; email?: string }[] }[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<typeof accounts[0] | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountId: "",
      contactId: "",
      dueDate: "",
      currency: "USD",
      taxRate: undefined,
      discountType: undefined,
      discountValue: undefined,
      notes: "",
      terms: "",
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Load invoice and accounts
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch invoice
        const invoiceRes = await fetch(`/api/invoices/${id}`);
        if (!invoiceRes.ok) throw new Error("Invoice not found");
        const invoice = await invoiceRes.json();

        // Check if editable
        if (invoice.status !== "DRAFT") {
          toast.error("Only draft invoices can be edited");
          router.push(`/sales/invoices/${id}`);
          return;
        }

        setInvoiceNumber(invoice.invoiceNumber);

        // Fetch accounts
        const accountsRes = await fetch("/api/accounts?limit=100");
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json();
          const accountsList = accountsData.data || accountsData.accounts || [];
          // Fetch contacts for each account
          const accountsWithContacts = await Promise.all(
            accountsList.map(async (account: { id: string; name: string }) => {
              const contactsRes = await fetch(`/api/contacts?accountId=${account.id}&limit=50`);
              if (contactsRes.ok) {
                const contactsData = await contactsRes.json();
                return { ...account, contacts: contactsData.data || contactsData.contacts || [] };
              }
              return account;
            })
          );
          setAccounts(accountsWithContacts);

          // Set selected account
          const account = accountsWithContacts.find((a: { id: string }) => a.id === invoice.accountId);
          setSelectedAccount(account || null);
        }

        // Set form values
        form.reset({
          accountId: invoice.accountId,
          contactId: invoice.contactId || "",
          dueDate: new Date(invoice.dueDate).toISOString().split("T")[0],
          currency: invoice.currency,
          taxRate: invoice.taxRate ? Number(invoice.taxRate) : undefined,
          discountType: invoice.discountType || undefined,
          discountValue: invoice.discountValue ? Number(invoice.discountValue) : undefined,
          notes: invoice.notes || "",
          terms: invoice.terms || "",
          items: invoice.items.map((item: Record<string, unknown>) => ({
            id: item.id,
            description: item.description,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            itemCode: item.itemCode || "",
          })),
        });
      } catch (error) {
        console.error("Error loading invoice:", error);
        toast.error("Failed to load invoice");
        router.push("/sales/invoices");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, form, router]);

  // Watch for account changes
  const watchAccountId = form.watch("accountId");
  
  useEffect(() => {
    if (watchAccountId) {
      const account = accounts.find((a) => a.id === watchAccountId);
      setSelectedAccount(account || null);
    }
  }, [watchAccountId, accounts]);

  // Calculate totals
  const items = form.watch("items");
  const taxRate = form.watch("taxRate") || 0;
  const discountType = form.watch("discountType");
  const discountValue = form.watch("discountValue") || 0;

  const subtotal = items.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.unitPrice || 0);
  }, 0);

  let discountAmount = 0;
  if (discountValue && discountType) {
    if (discountType === "PERCENTAGE") {
      discountAmount = subtotal * (discountValue / 100);
    } else {
      discountAmount = Math.min(discountValue, subtotal);
    }
  }

  const subtotalAfterDiscount = subtotal - discountAmount;
  const taxAmount = subtotalAfterDiscount * (taxRate / 100);
  const total = subtotalAfterDiscount + taxAmount;

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          dueDate: new Date(data.dueDate),
          taxRate: data.taxRate || null,
          discountType: data.discountType || null,
          discountValue: data.discountValue || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update invoice");
      }

      toast.success("Invoice updated successfully");
      router.push(`/sales/invoices/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: form.watch("currency") || "USD",
    }).format(value);
  };

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
          <Link href={`/sales/invoices/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Invoice {invoiceNumber}</h1>
          <p className="text-muted-foreground">
            Make changes to your draft invoice
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Left column - Bill To */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bill To</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="accountId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {accounts.map((account) => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contactId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={!selectedAccount?.contacts?.length}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select contact" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedAccount?.contacts?.map((contact) => (
                            <SelectItem key={contact.id} value={contact.id}>
                              {contact.firstName} {contact.lastName}
                              {contact.email && ` (${contact.email})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Right column - Invoice Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="EGP">EGP - Egyptian Pound</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Header */}
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                  <div className="col-span-5">Description</div>
                  <div className="col-span-2">Quantity</div>
                  <div className="col-span-2">Unit Price</div>
                  <div className="col-span-2 text-right">Amount</div>
                  <div className="col-span-1"></div>
                </div>

                {/* Items */}
                {fields.map((field, index) => {
                  const quantity = form.watch(`items.${index}.quantity`) || 0;
                  const unitPrice = form.watch(`items.${index}.unitPrice`) || 0;
                  const amount = quantity * unitPrice;

                  return (
                    <div key={field.id} className="grid grid-cols-12 gap-4 items-start">
                      <div className="col-span-5">
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Item description" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" step="0.01" min="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input type="number" step="0.01" min="0" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="col-span-2 text-right pt-2 font-medium">
                        {formatCurrency(amount)}
                      </div>
                      <div className="col-span-1">
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add item button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ description: "", quantity: 1, unitPrice: 0, itemCode: "" })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              <Separator className="my-6" />

              {/* Totals section */}
              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>

                  {/* Discount */}
                  <div className="flex gap-2 items-center">
                    <Select
                      value={form.watch("discountType") || "_none"}
                      onValueChange={(v) => form.setValue("discountType", v === "_none" ? undefined : v as "PERCENTAGE" | "FIXED")}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Discount" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">No discount</SelectItem>
                        <SelectItem value="PERCENTAGE">%</SelectItem>
                        <SelectItem value="FIXED">Fixed</SelectItem>
                      </SelectContent>
                    </Select>
                    {discountType && (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-[80px]"
                        value={form.watch("discountValue") || ""}
                        onChange={(e) => form.setValue("discountValue", parseFloat(e.target.value) || 0)}
                      />
                    )}
                    {discountAmount > 0 && (
                      <span className="text-red-600 ml-auto">-{formatCurrency(discountAmount)}</span>
                    )}
                  </div>

                  {/* Tax */}
                  <div className="flex gap-2 items-center">
                    <Label className="text-muted-foreground">Tax %</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      className="w-[80px]"
                      value={form.watch("taxRate") || ""}
                      onChange={(e) => form.setValue("taxRate", parseFloat(e.target.value) || 0)}
                    />
                    {taxAmount > 0 && (
                      <span className="ml-auto">{formatCurrency(taxAmount)}</span>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes & Terms */}
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes to the customer (appears on invoice)"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="terms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms & Conditions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Payment terms and conditions"
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/sales/invoices/${id}`)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
