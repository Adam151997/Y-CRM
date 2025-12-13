"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Renewal {
  id: string;
  contractName: string | null;
  contractValue: string | number;
  currency: string;
  startDate: string;
  endDate: string;
  status: string;
  probability: number;
  notes: string | null;
}

interface AccountRenewalsProps {
  renewals: Renewal[];
  accountId: string;
}

const statusColors: Record<string, string> = {
  UPCOMING: "bg-blue-500/10 text-blue-500",
  IN_PROGRESS: "bg-yellow-500/10 text-yellow-500",
  RENEWED: "bg-green-500/10 text-green-500",
  CHURNED: "bg-red-500/10 text-red-500",
  DOWNGRADED: "bg-orange-500/10 text-orange-500",
  EXPANDED: "bg-purple-500/10 text-purple-500",
};

const STATUS_OPTIONS = [
  { value: "UPCOMING", label: "Upcoming" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "RENEWED", label: "Renewed" },
  { value: "CHURNED", label: "Churned" },
  { value: "DOWNGRADED", label: "Downgraded" },
  { value: "EXPANDED", label: "Expanded" },
];

function formatCurrency(value: string | number, currency: string = "USD"): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getDaysUntil(endDate: string): number {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function AccountRenewals({ renewals: initialRenewals, accountId }: AccountRenewalsProps) {
  const [renewals, setRenewals] = useState(initialRenewals);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [contractName, setContractName] = useState("");
  const [contractValue, setContractValue] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("UPCOMING");
  const [probability, setProbability] = useState("50");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setContractName("");
    setContractValue("");
    setCurrency("USD");
    setStartDate("");
    setEndDate("");
    setStatus("UPCOMING");
    setProbability("50");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!contractValue || !startDate || !endDate) {
      toast.error("Please fill in required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/cs/renewals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          contractName: contractName || undefined,
          contractValue: parseFloat(contractValue),
          currency,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          status,
          probability: parseInt(probability),
          notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create renewal");
      }

      const data = await response.json();
      setRenewals([data.renewal, ...renewals]);
      toast.success("Renewal created successfully");
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create renewal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Renewals
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Renewal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Renewal</DialogTitle>
              <DialogDescription>
                Track a contract renewal for this account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="contractName">Contract Name</Label>
                <Input
                  id="contractName"
                  value={contractName}
                  onChange={(e) => setContractName(e.target.value)}
                  placeholder="Annual Subscription"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contractValue">Contract Value *</Label>
                  <Input
                    id="contractValue"
                    type="number"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value)}
                    placeholder="10000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="EGP">EGP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="probability">Probability %</Label>
                  <Input
                    id="probability"
                    type="number"
                    min="0"
                    max="100"
                    value={probability}
                    onChange={(e) => setProbability(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Renewal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {renewals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No renewals tracked for this account</p>
            <p className="text-sm">Add a renewal to start tracking contracts</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contract</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Probability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {renewals.map((renewal) => {
                const daysUntil = getDaysUntil(renewal.endDate);
                const isExpiringSoon = daysUntil <= 30 && daysUntil > 0;
                const isExpired = daysUntil <= 0 && !["RENEWED", "CHURNED", "EXPANDED", "DOWNGRADED"].includes(renewal.status);
                
                return (
                  <TableRow key={renewal.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {renewal.contractName || "Unnamed Contract"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Started {formatDate(renewal.startDate)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(renewal.contractValue, renewal.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{formatDate(renewal.endDate)}</span>
                        {isExpiringSoon && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {daysUntil}d
                          </Badge>
                        )}
                        {isExpired && (
                          <Badge variant="outline" className="text-red-600 border-red-300">
                            Expired
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[renewal.status] || "bg-gray-100"}>
                        {renewal.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={
                        renewal.probability >= 70 ? "text-green-600" :
                        renewal.probability >= 40 ? "text-yellow-600" :
                        "text-red-600"
                      }>
                        {renewal.probability}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
