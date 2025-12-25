"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Plus,
  Minus,
  Package,
} from "lucide-react";
import { StockAdjustmentDialog } from "./stock-adjustment-dialog";

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
}

interface InventoryTableProps {
  items: InventoryItem[];
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function getStockStatusBadge(status: string) {
  switch (status) {
    case "IN_STOCK":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">In Stock</Badge>;
    case "LOW_STOCK":
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Low Stock</Badge>;
    case "OUT_OF_STOCK":
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Out of Stock</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function InventoryTable({ items, onDelete, onRefresh }: InventoryTableProps) {
  const [adjustmentItem, setAdjustmentItem] = useState<InventoryItem | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");

  const handleOpenAdjustment = (item: InventoryItem, type: "add" | "remove") => {
    setAdjustmentItem(item);
    setAdjustmentType(type);
  };

  const handleCloseAdjustment = () => {
    setAdjustmentItem(null);
  };

  const handleAdjustmentSuccess = () => {
    setAdjustmentItem(null);
    onRefresh();
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-1">No inventory items</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Get started by adding your first inventory item.
        </p>
        <Button asChild>
          <Link href="/sales/inventory/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>SKU</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-right">Margin</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Link
                  href={`/sales/inventory/${item.id}`}
                  className="font-medium hover:underline"
                >
                  {item.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground font-mono text-sm">
                {item.sku}
              </TableCell>
              <TableCell>
                {item.category ? (
                  <Badge variant="outline">{item.category}</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <span className="font-medium">{item.stockLevel}</span>
                <span className="text-muted-foreground ml-1">{item.unit}</span>
                {item.reorderLevel > 0 && item.stockLevel <= item.reorderLevel && (
                  <span className="text-xs text-yellow-600 ml-2">
                    (reorder at {item.reorderLevel})
                  </span>
                )}
              </TableCell>
              <TableCell>{getStockStatusBadge(item.stockStatus)}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(item.unitPrice)}
              </TableCell>
              <TableCell className="text-right">
                {item.margin !== null ? (
                  <span
                    className={
                      item.margin > 0 ? "text-green-600" : item.margin < 0 ? "text-red-600" : ""
                    }
                  >
                    {item.margin.toFixed(1)}%
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/sales/inventory/${item.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/sales/inventory/${item.id}/edit`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleOpenAdjustment(item, "add")}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Stock
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenAdjustment(item, "remove")}>
                      <Minus className="h-4 w-4 mr-2" />
                      Remove Stock
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => onDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Deactivate
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Stock Adjustment Dialog */}
      <StockAdjustmentDialog
        item={adjustmentItem}
        type={adjustmentType}
        onClose={handleCloseAdjustment}
        onSuccess={handleAdjustmentSuccess}
      />
    </>
  );
}
