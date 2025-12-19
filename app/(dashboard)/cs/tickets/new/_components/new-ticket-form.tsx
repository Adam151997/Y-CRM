"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const ticketSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  description: z.string().optional(),
  accountId: z.string().min(1, "Account is required"),
  contactId: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  category: z.string().optional(),
  assignedToId: z.string().optional(),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

interface Account {
  id: string;
  name: string;
}

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  accountId: string | null;
}

interface TeamMember {
  id: string;
  name: string;
}

interface NewTicketFormProps {
  accounts: Account[];
  contacts: Contact[];
  teamMembers: TeamMember[];
}

export function NewTicketForm({ accounts, contacts, teamMembers }: NewTicketFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      subject: "",
      description: "",
      accountId: "",
      contactId: "",
      priority: "MEDIUM",
      category: "",
      assignedToId: "",
    },
  });

  const selectedAccountId = form.watch("accountId");
  
  // Filter contacts by selected account
  const filteredContacts = selectedAccountId
    ? contacts.filter((c) => c.accountId === selectedAccountId)
    : contacts;

  const onSubmit = async (data: TicketFormValues) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/cs/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create ticket");
      }

      const { ticket } = await response.json();
      toast.success("Ticket created successfully");
      router.push(`/cs/tickets/${ticket.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input placeholder="Brief description of the issue" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Detailed description of the issue..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Include any relevant details that will help resolve the issue
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
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
                <FormLabel>Contact (Optional)</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="_none">No specific contact</SelectItem>
                    {filteredContacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.firstName} {contact.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category (Optional)</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="_none">No category</SelectItem>
                    <SelectItem value="BUG">Bug</SelectItem>
                    <SelectItem value="BILLING">Billing</SelectItem>
                    <SelectItem value="FEATURE_REQUEST">Feature Request</SelectItem>
                    <SelectItem value="QUESTION">Question</SelectItem>
                    <SelectItem value="GENERAL">General</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="assignedToId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assign To (Optional)</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="_none">Unassigned</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Assign this ticket to a support agent
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Ticket
          </Button>
        </div>
      </form>
    </Form>
  );
}
