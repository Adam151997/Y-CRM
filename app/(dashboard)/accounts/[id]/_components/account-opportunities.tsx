"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Opportunity {
  id: string;
  name: string;
  value: string | number;
  probability: number;
  expectedCloseDate: Date | null;
  stage: {
    name: string;
    color: string | null;
  };
}

interface AccountOpportunitiesProps {
  opportunities: Opportunity[];
  accountId: string;
}

function formatCurrency(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(num);
}

export function AccountOpportunities({
  opportunities,
  accountId,
}: AccountOpportunitiesProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Opportunities</CardTitle>
        <Button size="sm" asChild>
          <Link href={`/opportunities/new?accountId=${accountId}`}>
            <Plus className="h-4 w-4 mr-2" />
            Add Opportunity
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {opportunities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No opportunities yet</p>
            <Button variant="link" asChild>
              <Link href={`/opportunities/new?accountId=${accountId}`}>
                Create the first opportunity
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {opportunities.map((opp) => (
              <Link
                key={opp.id}
                href={`/opportunities/${opp.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">{opp.name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {formatCurrency(opp.value)}
                      </span>
                      <span>•</span>
                      <span>{opp.probability}% probability</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {opp.expectedCloseDate && (
                    <span className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-1" />
                      {format(new Date(opp.expectedCloseDate), "MMM d, yyyy")}
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: opp.stage.color || undefined,
                      color: opp.stage.color || undefined,
                    }}
                  >
                    {opp.stage.name}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
