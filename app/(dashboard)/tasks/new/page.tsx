import { TaskForm } from "@/components/forms";

export default function NewTaskPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Task</h2>
        <p className="text-muted-foreground">Create a new task to track your work</p>
      </div>

      <TaskForm />
    </div>
  );
}
