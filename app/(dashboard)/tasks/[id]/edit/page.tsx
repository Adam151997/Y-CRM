import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import prisma from "@/lib/db";
import { TaskForm } from "@/components/forms";

interface EditTaskPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTaskPage({ params }: EditTaskPageProps) {
  const { orgId } = await getAuthContext();
  const { id } = await params;

  const task = await prisma.task.findFirst({
    where: { id, orgId },
  });

  if (!task) {
    notFound();
  }

  const formData = {
    id: task.id,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    priority: task.priority,
    status: task.status,
    taskType: task.taskType,
    leadId: task.leadId,
    contactId: task.contactId,
    accountId: task.accountId,
    opportunityId: task.opportunityId,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Edit Task</h2>
        <p className="text-muted-foreground">Update task details</p>
      </div>

      <TaskForm initialData={formData} />
    </div>
  );
}
