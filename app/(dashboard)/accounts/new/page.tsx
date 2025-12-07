import { AccountForm } from "@/components/forms";

export default function NewAccountPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">New Account</h2>
        <p className="text-muted-foreground">
          Add a new company or organization to your CRM
        </p>
      </div>

      <AccountForm />
    </div>
  );
}
