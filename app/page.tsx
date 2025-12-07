import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const { userId, orgId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // If user is authenticated, redirect to dashboard
  redirect("/dashboard");
}
