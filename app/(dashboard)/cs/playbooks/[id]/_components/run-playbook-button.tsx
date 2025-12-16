"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Play, Loader2 } from "lucide-react";

interface Account {
  id: string;
  name: string;
}

interface RunPlaybookButtonProps {
  playbookId: string;
  playbookName: string;
}

export function RunPlaybookButton({ playbookId, playbookName }: RunPlaybookButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      fetch("/api/accounts?limit=100")
        .then((res) => res.json())
        .then((data) => {
          setAccounts(data.data || []);
        })
        .catch((error) => {
          console.error("Failed to fetch accounts:", error);
          toast.error("Failed to load accounts");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open]);

  const handleRun = async () => {
    if (!selectedAccount) {
      toast.error("Please select an account");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/cs/playbooks/${playbookId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedAccount }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start playbook");
      }

      toast.success("Playbook started successfully");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Play className="h-4 w-4 mr-2" />
          Run Playbook
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run Playbook</DialogTitle>
          <DialogDescription>
            Start "{playbookName}" for a customer account. This will create tasks according to the playbook steps.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label htmlFor="account">Select Account</Label>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Choose an account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleRun} disabled={!selectedAccount || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Start Playbook
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
