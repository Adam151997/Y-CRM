import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NewPlaybookForm } from "./_components/new-playbook-form";

export default function NewPlaybookPage() {
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" asChild>
        <Link href="/cs/playbooks">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Playbooks
        </Link>
      </Button>

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Create New Playbook</CardTitle>
          <CardDescription>
            Define a repeatable process for customer success activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewPlaybookForm />
        </CardContent>
      </Card>
    </div>
  );
}
