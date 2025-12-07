"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, Mail, Phone, Star } from "lucide-react";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  isPrimary: boolean;
}

interface AccountContactsProps {
  contacts: Contact[];
  accountId: string;
}

export function AccountContacts({ contacts, accountId }: AccountContactsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Contacts</CardTitle>
        <Button size="sm" asChild>
          <Link href={`/contacts/new?accountId=${accountId}`}>
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No contacts yet</p>
            <Button variant="link" asChild>
              <Link href={`/contacts/new?accountId=${accountId}`}>
                Add the first contact
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <Link
                key={contact.id}
                href={`/contacts/${contact.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {contact.firstName[0]}
                      {contact.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {contact.firstName} {contact.lastName}
                      </p>
                      {contact.isPrimary && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Primary
                        </Badge>
                      )}
                    </div>
                    {contact.title && (
                      <p className="text-sm text-muted-foreground">{contact.title}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {contact.email && (
                    <span className="flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      {contact.email}
                    </span>
                  )}
                  {contact.phone && (
                    <span className="flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      {contact.phone}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
