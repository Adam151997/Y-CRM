"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Plus, Trash2, Loader2 } from "lucide-react";
import { createInvoiceSchema } from "@/lib/validation/invoices";

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
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
    unitPrice: z.coerce.number().min(0, "Price must be 0 or greater"),
    itemCode: z.string().optional(),
  })).min(1, "At least one item is required"),
});

type FormValues = z.infer<typeof formSchema>;

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

interface InvoiceFormProps {
  accounts: Account[];
  defaultAccountId?: string;
}

export function InvoiceForm({ accounts, defaultAccountId }: InvoiceFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // Set default due date to 30 days from now
  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 30);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      accountId: defaultAccountId || "",
      contactId: "",
      dueDate: defaultDueDate.toISOString().split("T")[0],
      currency: "USD",
      taxRate: undefined,
      discountType: undefined,
      discountValue: undefined,
      notes: "",
      terms: "Payment is due within 30 days of invoice date.",
      items: [{ description: "", quantity: 1, unitPrice: 0, itemCode: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Watch for account changes to update contacts
  const watchAccountId = form.watch("accountId");
  
  useEffect(() => {
    if (watchAccountId) {
      const account = accounts.find((a) => a.id === watchAccountId);
      setSelectedAccount(account || null);
      
      // Auto-select first contact if available
      if (account?.contacts && account.contacts.length > 0) {
        form.setValue("contactId", account.contacts[0].id);
      } else {
        form.setValue("contactId", "");
      }
    } else {
      setSelectedAccount(null);
    }
  }, [watchAccountId, accounts, form]);

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
      const response = await fetch("/api/invoices", {
        method: "POST",
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
        throw new Error(error.error || "Failed to create invoice");
      }

      const invoice = await response.json();
      toast.success("Invoice created successfully");
      router.push(`/sales/invoices/${invoice.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create invoice");
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

  return (
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
            Create Invoice
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
