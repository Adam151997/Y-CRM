"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { InventoryForm } from "../../_components/inventory-form";

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
}

export default function EditInventoryItemPage() {
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

    fetchItem();
  }, [params.id, router]);

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

  return <InventoryForm initialData={item} mode="edit" />;
}
