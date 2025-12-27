"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";
import { ArrowLeft, Loader2, DollarSign } from "lucide-react";
import { CURRENCIES } from "@/lib/constants/currencies";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  salary: string | null;
  salaryType: string;
  currency: string;
}

export default function NewPayrollPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const currentDate = new Date();
  const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

  const [formData, setFormData] = useState({
    employeeId: "",
    payPeriod: currentMonth,
    startDate: "",
    endDate: "",
    baseSalary: "",
    overtime: "0",
    bonus: "0",
    commission: "0",
    allowances: "0",
    taxDeduction: "0",
    insuranceDeduction: "0",
    retirementDeduction: "0",
    otherDeductions: "0",
    currency: "USD",
    paymentMethod: "BANK_TRANSFER",
    notes: "",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    // Set period dates based on payPeriod
    if (formData.payPeriod) {
      const [year, month] = formData.payPeriod.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      setFormData(prev => ({
        ...prev,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      }));
    }
  }, [formData.payPeriod]);

  useEffect(() => {
    // Auto-fill salary when employee is selected
    if (selectedEmployee && selectedEmployee.salary) {
      setFormData(prev => ({
        ...prev,
        baseSalary: selectedEmployee.salary || "",
        currency: selectedEmployee.currency || "USD",
      }));
    }
  }, [selectedEmployee]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees?limit=1000&status=ACTIVE");
      const data = await response.json();
      setEmployees(data.data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleEmployeeChange = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    setSelectedEmployee(employee || null);
    setFormData(prev => ({ ...prev, employeeId }));
  };

  const calculateTotals = () => {
    const grossPay =
      parseFloat(formData.baseSalary || "0") +
      parseFloat(formData.overtime || "0") +
      parseFloat(formData.bonus || "0") +
      parseFloat(formData.commission || "0") +
      parseFloat(formData.allowances || "0");

    const totalDeductions =
      parseFloat(formData.taxDeduction || "0") +
      parseFloat(formData.insuranceDeduction || "0") +
      parseFloat(formData.retirementDeduction || "0") +
      parseFloat(formData.otherDeductions || "0");

    const netPay = grossPay - totalDeductions;

    return { grossPay, totalDeductions, netPay };
  };

  const { grossPay, totalDeductions, netPay } = calculateTotals();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: formData.employeeId,
          payPeriod: formData.payPeriod,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
          baseSalary: parseFloat(formData.baseSalary || "0"),
          overtime: parseFloat(formData.overtime || "0"),
          bonus: parseFloat(formData.bonus || "0"),
          commission: parseFloat(formData.commission || "0"),
          allowances: parseFloat(formData.allowances || "0"),
          taxDeduction: parseFloat(formData.taxDeduction || "0"),
          insuranceDeduction: parseFloat(formData.insuranceDeduction || "0"),
          retirementDeduction: parseFloat(formData.retirementDeduction || "0"),
          otherDeductions: parseFloat(formData.otherDeductions || "0"),
          currency: formData.currency,
          paymentMethod: formData.paymentMethod,
          notes: formData.notes || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create payroll");
      }

      const payroll = await response.json();
      toast.success("Payroll created successfully");
      router.push(`/hr/payroll/${payroll.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create payroll");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: formData.currency,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/hr/payroll">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            Create Payroll
          </h2>
          <p className="text-muted-foreground">
            Generate a new payroll record
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Employee & Period */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Employee & Pay Period</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee *</Label>
                  <Select
                    value={formData.employeeId}
                    onValueChange={handleEmployeeChange}
                    disabled={loadingEmployees}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingEmployees ? "Loading..." : "Select employee"} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payPeriod">Pay Period *</Label>
                  <Input
                    id="payPeriod"
                    type="month"
                    value={formData.payPeriod}
                    onChange={(e) => setFormData({ ...formData, payPeriod: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Period Start</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Period End</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Pay</span>
                <span className="font-medium">{formatCurrency(grossPay)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span>Deductions</span>
                <span>-{formatCurrency(totalDeductions)}</span>
              </div>
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>Net Pay</span>
                <span>{formatCurrency(netPay)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Earnings */}
          <Card>
            <CardHeader>
              <CardTitle>Earnings</CardTitle>
              <CardDescription>Income components</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="baseSalary">Base Salary *</Label>
                <Input
                  id="baseSalary"
                  type="number"
                  step="0.01"
                  value={formData.baseSalary}
                  onChange={(e) => setFormData({ ...formData, baseSalary: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overtime">Overtime</Label>
                <Input
                  id="overtime"
                  type="number"
                  step="0.01"
                  value={formData.overtime}
                  onChange={(e) => setFormData({ ...formData, overtime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bonus">Bonus</Label>
                <Input
                  id="bonus"
                  type="number"
                  step="0.01"
                  value={formData.bonus}
                  onChange={(e) => setFormData({ ...formData, bonus: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commission">Commission</Label>
                <Input
                  id="commission"
                  type="number"
                  step="0.01"
                  value={formData.commission}
                  onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allowances">Allowances</Label>
                <Input
                  id="allowances"
                  type="number"
                  step="0.01"
                  value={formData.allowances}
                  onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Deductions */}
          <Card>
            <CardHeader>
              <CardTitle>Deductions</CardTitle>
              <CardDescription>Withholdings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taxDeduction">Tax</Label>
                <Input
                  id="taxDeduction"
                  type="number"
                  step="0.01"
                  value={formData.taxDeduction}
                  onChange={(e) => setFormData({ ...formData, taxDeduction: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="insuranceDeduction">Insurance</Label>
                <Input
                  id="insuranceDeduction"
                  type="number"
                  step="0.01"
                  value={formData.insuranceDeduction}
                  onChange={(e) => setFormData({ ...formData, insuranceDeduction: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retirementDeduction">Retirement/401k</Label>
                <Input
                  id="retirementDeduction"
                  type="number"
                  step="0.01"
                  value={formData.retirementDeduction}
                  onChange={(e) => setFormData({ ...formData, retirementDeduction: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherDeductions">Other Deductions</Label>
                <Input
                  id="otherDeductions"
                  type="number"
                  step="0.01"
                  value={formData.otherDeductions}
                  onChange={(e) => setFormData({ ...formData, otherDeductions: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CHECK">Check</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select
                  value={formData.currency}
                  onValueChange={(val) => setFormData({ ...formData, currency: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" asChild>
            <Link href="/hr/payroll">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving || !formData.employeeId}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Payroll"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
