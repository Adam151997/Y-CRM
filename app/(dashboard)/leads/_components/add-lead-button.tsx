"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { CanAccess } from "@/components/can-access";

interface AddLeadButtonProps {
  className?: string;
}

export function AddLeadButton({ className }: AddLeadButtonProps) {
  const t = useTranslations("modules.leads");

  return (
    <CanAccess module="leads" action="create">
      <Button asChild className={className}>
        <Link href="/leads/new">
          <Plus className="h-4 w-4 mr-2" />
          {t("addLead")}
        </Link>
      </Button>
    </CanAccess>
  );
}
