"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Minus,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { StockAdjustmentDialog } from "../_components/stock-adjustment-dialog";

interface InventoryItem {
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
  createdAt: string;
  updatedAt: string;
}

interface StockMovement {
  id: string;
  type: string;
  quantity: number;
  previousLevel: number;
  newLevel: number;
  reason: string | null;
  notes: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  createdByType: string;
}

export default function InventoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMovements, setIsLoadingMovements] = useState(true);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove" | null>(null);

  const fetchItem = async () => {
    try {
      const response = await fetch(`/api/inventory/${params.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Item not found");
          router.push("/sales/inventory");
          return;
        }
        throw new Error("Failed to fetch item");
      }
      const data = await response.json();
      setItem(data);
    } catch (error) {
      toast.error("Failed to load inventory item");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      const response = await fetch(`/api/inventory/${params.id}/movements`);
      if (response.ok) {
        const data = await response.json();
        setMovements(data.movements || []);
      }
    } catch (error) {
      console.error("Failed to load movements:", error);
    } finally {
      setIsLoadingMovements(false);
    }
  };

  useEffect(() => {
    fetchItem();
    fetchMovements();
  }, [params.id]);

  const getStockStatus = () => {
    if (!item) return null;
    if (item.stockLevel === 0) {
      return { label: "Out of Stock", variant: "destructive" as const, icon: XCircle };
    }
    if (item.stockLevel <= item.reorderLevel) {
      return { label: "Low Stock", variant: "warning" as const, icon: AlertTriangle };
    }
    return { label: "In Stock", variant: "success" as const, icon: CheckCircle };
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "RESTOCK":
      case "INITIAL":
      case "RESTORATION":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "SALE":
      case "DAMAGE":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMovementBadgeVariant = (type: string) => {
    switch (type) {
      case "RESTOCK":
      case "INITIAL":
      case "RESTORATION":
        return "success";
      case "SALE":
      case "DAMAGE":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const margin =
    item && item.costPrice !== null && item.unitPrice > 0
      ? (((item.unitPrice - item.costPrice) / item.unitPrice) * 100).toFixed(1)
      : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-20" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!item) {
    return null;
  }

  const stockStatus = getStockStatus();

  return (
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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{item.name}</h1>
              {stockStatus && (
                <Badge variant={stockStatus.variant as "default"}>
                  <stockStatus.icon className="h-3 w-3 mr-1" />
                  {stockStatus.label}
                </Badge>
              )}
              {!item.isActive && <Badge variant="secondary">Inactive</Badge>}
            </div>
            <p className="text-muted-foreground">SKU: {item.sku}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAdjustmentType("add")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Stock
          </Button>
          <Button variant="outline" onClick={() => setAdjustmentType("remove")}>
            <Minus className="h-4 w-4 mr-2" />
            Remove Stock
          </Button>
          <Button asChild>
            <Link href={`/sales/inventory/${item.id}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {item.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p>{item.description}</p>
              </div>
            )}
            {item.category && (
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p>{item.category}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Unit</p>
                <p className="font-medium">{item.unit}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">
                  {format(new Date(item.createdAt), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Card */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Unit Price</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(item.unitPrice)}
                </p>
              </div>
              {item.costPrice !== null && (
                <div>
                  <p className="text-sm text-muted-foreground">Cost Price</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(item.costPrice)}
                  </p>
                </div>
              )}
            </div>
            {margin !== null && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">Profit Margin</p>
                <p
                  className={`text-lg font-medium ${
                    parseFloat(margin) > 0
                      ? "text-green-600"
                      : parseFloat(margin) < 0
                      ? "text-red-600"
                      : ""
                  }`}
                >
                  {margin}%
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock Card */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Levels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Stock</p>
                <p className="text-2xl font-bold">
                  {item.stockLevel} {item.unit}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reorder Level</p>
                <p className="text-2xl font-bold">
                  {item.reorderLevel} {item.unit}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Inventory Value</p>
              <p className="text-lg font-medium">
                {formatCurrency(item.stockLevel * item.unitPrice)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stock History Card */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Stock Movements</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingMovements ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : movements.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No stock movements recorded yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.slice(0, 10).map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMovementIcon(movement.type)}
                          <Badge
                            variant={
                              getMovementBadgeVariant(movement.type) as "default"
                            }
                          >
                            {movement.type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            movement.quantity > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {movement.quantity > 0 ? "+" : ""}
                          {movement.quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        {movement.previousLevel} → {movement.newLevel}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(movement.createdAt), "MMM d, HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stock Adjustment Dialog */}
      {adjustmentType && (
        <StockAdjustmentDialog
          item={{ id: item.id, name: item.name, sku: item.sku, stockLevel: item.stockLevel, unit: item.unit }}
          type={adjustmentType}
          onClose={() => setAdjustmentType(null)}
          onSuccess={() => {
            setAdjustmentType(null);
            fetchItem();
            fetchMovements();
          }}
        />
      )}
    </div>
  );
}
