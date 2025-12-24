"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Package,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { InventoryFilters } from "./_components/inventory-filters";
import { InventoryTable } from "./_components/inventory-table";
import InventoryLoading from "./loading";

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
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  margin: number | null;
  createdAt: string;
  updatedAt: string;
}

interface InventoryData {
  items: InventoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

function InventoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalItems: 0,
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    totalValue: 0,
  });

  // Fetch inventory items
  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams(searchParams.toString());
      const response = await fetch(`/api/inventory?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch inventory");
      }

      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      // Calculate stats from items or use a dedicated endpoint
      if (data?.items) {
        const items = data.items;
        setStats({
          totalItems: data.pagination.total,
          inStock: items.filter((i) => i.stockStatus === "IN_STOCK").length,
          lowStock: items.filter((i) => i.stockStatus === "LOW_STOCK").length,
          outOfStock: items.filter((i) => i.stockStatus === "OUT_OF_STOCK").length,
          totalValue: items.reduce((sum, i) => sum + i.stockLevel * i.unitPrice, 0),
        });
      }
    } catch (error) {
      console.error("Error calculating stats:", error);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [searchParams]);

  useEffect(() => {
    if (data) {
      fetchStats();
    }
  }, [data]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to deactivate this inventory item?")) return;

    try {
      const response = await fetch(`/api/inventory/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete item");
      }

      toast.success("Item deactivated");
      fetchInventory();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete item");
    }
  };

  if (loading && !data) {
    return <InventoryLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">
            Manage products, track stock levels, and monitor inventory
          </p>
        </div>
        <Button asChild>
          <Link href="/sales/inventory/new">
            <Plus className="h-4 w-4 mr-2" />
            New Item
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Items
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.lowStock}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Out of Stock
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inventory Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalValue)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <InventoryFilters />

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <InventoryTable
            items={data?.items || []}
            onDelete={handleDelete}
            onRefresh={fetchInventory}
          />
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(data.pagination.page - 1) * data.pagination.limit + 1} to{" "}
            {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{" "}
            {data.pagination.total} items
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.pagination.page === 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(data.pagination.page - 1));
                router.push(`?${params.toString()}`);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.pagination.page === data.pagination.totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("page", String(data.pagination.page + 1));
                router.push(`?${params.toString()}`);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<InventoryLoading />}>
      <InventoryContent />
    </Suspense>
  );
}
