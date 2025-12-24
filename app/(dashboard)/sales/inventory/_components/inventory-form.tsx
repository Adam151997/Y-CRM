"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface InventoryFormProps {
  initialData?: {
    id: string;
    name: string;
    sku: string;
    description: string | null;
    stockLevel: number;
    reorderLevel: number;
    unit: string;
    unitPrice: number;
    costPrice: number | null;
    category: string | null;
    tags: string[];
    isActive: boolean;
  };
  mode: "create" | "edit";
}

const UNITS = [
  { value: "pcs", label: "Pieces" },
  { value: "kg", label: "Kilograms" },
  { value: "g", label: "Grams" },
  { value: "liters", label: "Liters" },
  { value: "ml", label: "Milliliters" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
  { value: "meters", label: "Meters" },
  { value: "sqm", label: "Square Meters" },
  { value: "box", label: "Boxes" },
  { value: "pack", label: "Packs" },
];

export function InventoryForm({ initialData, mode }: InventoryFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    sku: initialData?.sku || "",
    description: initialData?.description || "",
    stockLevel: initialData?.stockLevel ?? 0,
    reorderLevel: initialData?.reorderLevel ?? 0,
    unit: initialData?.unit || "pcs",
    unitPrice: initialData?.unitPrice ?? 0,
    costPrice: initialData?.costPrice ?? "",
    category: initialData?.category || "",
    isActive: initialData?.isActive ?? true,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : parseFloat(value)) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!formData.sku.trim()) {
      toast.error("SKU is required");
      return;
    }

    if (formData.unitPrice <= 0) {
      toast.error("Unit price must be greater than 0");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        sku: formData.sku.trim(),
        description: formData.description.trim() || null,
        stockLevel: formData.stockLevel,
        reorderLevel: formData.reorderLevel,
        unit: formData.unit,
        unitPrice: formData.unitPrice,
        costPrice: formData.costPrice === "" ? null : formData.costPrice,
        category: formData.category.trim() || null,
        isActive: formData.isActive,
      };

      const url =
        mode === "edit"
          ? `/api/inventory/${initialData?.id}`
          : "/api/inventory";

      const response = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${mode} item`);
      }

      const result = await response.json();

      toast.success(
        mode === "edit"
          ? "Item updated successfully"
          : `Created item "${result.name}" (${result.sku})`
      );

      router.push("/sales/inventory");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${mode} item`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate margin
  const margin =
    formData.unitPrice > 0 && formData.costPrice !== "" && formData.costPrice
      ? (((formData.unitPrice - (formData.costPrice as number)) / formData.unitPrice) * 100).toFixed(1)
      : null;

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sales/inventory">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {mode === "edit" ? "Edit Item" : "New Inventory Item"}
              </h1>
              <p className="text-muted-foreground">
                {mode === "edit"
                  ? `Editing ${initialData?.name}`
                  : "Add a new product to your inventory"}
              </p>
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            {mode === "edit" ? "Save Changes" : "Create Item"}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Product name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  name="sku"
                  placeholder="e.g., PROD-001"
                  value={formData.sku}
                  onChange={handleChange}
                  pattern="^[A-Za-z0-9_-]+$"
                  title="Only letters, numbers, hyphens and underscores"
                  required
                  disabled={mode === "edit"}
                />
                {mode === "edit" && (
                  <p className="text-xs text-muted-foreground">
                    SKU cannot be changed after creation
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Product description..."
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  name="category"
                  placeholder="e.g., Electronics, Office Supplies"
                  value={formData.category}
                  onChange={handleChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="unitPrice">Unit Price *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="unitPrice"
                    name="unitPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-7"
                    value={formData.unitPrice}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="costPrice">Cost Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="costPrice"
                    name="costPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-7"
                    value={formData.costPrice}
                    onChange={handleChange}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Optional: Used to calculate profit margin
                </p>
              </div>

              {margin !== null && (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm">
                    Profit Margin:{" "}
                    <span
                      className={`font-medium ${
                        parseFloat(margin) > 0
                          ? "text-green-600"
                          : parseFloat(margin) < 0
                          ? "text-red-600"
                          : ""
                      }`}
                    >
                      {margin}%
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stock Management */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit of Measurement</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, unit: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {mode === "create" && (
                <div className="grid gap-2">
                  <Label htmlFor="stockLevel">Initial Stock Level</Label>
                  <Input
                    id="stockLevel"
                    name="stockLevel"
                    type="number"
                    min="0"
                    value={formData.stockLevel}
                    onChange={handleChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    Stock can be adjusted later via stock adjustments
                  </p>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="reorderLevel">Reorder Level</Label>
                <Input
                  id="reorderLevel"
                  name="reorderLevel"
                  type="number"
                  min="0"
                  value={formData.reorderLevel}
                  onChange={handleChange}
                />
                <p className="text-xs text-muted-foreground">
                  Alert when stock falls to or below this level
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Active Status</Label>
                <Select
                  value={formData.isActive ? "true" : "false"}
                  onValueChange={(v) =>
                    setFormData((prev) => ({ ...prev, isActive: v === "true" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Inactive items won&apos;t appear in invoice item selection
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
