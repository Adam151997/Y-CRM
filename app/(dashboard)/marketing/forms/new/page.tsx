import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewFormForm } from "./_components/new-form-form";

export default function NewFormPage() {
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/marketing/forms">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Forms
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Create New Form</CardTitle>
          <CardDescription>
            Build a lead capture form for your website
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewFormForm />
        </CardContent>
      </Card>
    </div>
  );
}
