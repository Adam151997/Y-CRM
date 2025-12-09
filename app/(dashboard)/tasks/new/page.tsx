import { Suspense } from "react";
import { TaskForm } from "@/components/forms";
import { Skeleton } from "@/components/ui/skeleton";

function TaskFormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[400px] w-full" />
      <div className="flex gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

export default function NewTaskPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Task</h2>
        <p className="text-muted-foreground">Create a new task to track your work</p>
      </div>

      <Suspense fallback={<TaskFormSkeleton />}>
        <TaskForm />
      </Suspense>
    </div>
  );
}
