import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewSegmentForm } from "./_components/new-segment-form";

export default function NewSegmentPage() {
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/marketing/segments">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Segments
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Create New Segment</CardTitle>
          <CardDescription>
            Define rules to create a dynamic audience segment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewSegmentForm />
        </CardContent>
      </Card>
    </div>
  );
}
