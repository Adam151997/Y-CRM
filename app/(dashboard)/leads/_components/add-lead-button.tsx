"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CanAccess } from "@/components/can-access";

interface AddLeadButtonProps {
  className?: string;
}

export function AddLeadButton({ className }: AddLeadButtonProps) {
  return (
    <CanAccess module="leads" action="create">
      <Button asChild className={className}>
        <Link href="/leads/new">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Link>
      </Button>
    </CanAccess>
  );
}
