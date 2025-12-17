import { Card, CardContent } from "@/components/ui/card";
import { FileQuestion } from "lucide-react";

export default function FormNotFound() {
  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardContent className="p-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileQuestion className="h-8 w-8 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
        <p className="text-gray-600">
          This form may have been removed or is no longer accepting submissions.
        </p>
      </CardContent>
    </Card>
  );
}
