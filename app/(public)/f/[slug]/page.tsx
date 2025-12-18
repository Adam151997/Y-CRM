import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { PublicFormRenderer } from "@/components/marketing/public-form-renderer";
import { Card, CardContent } from "@/components/ui/card";
import { Metadata } from "next";

// Force dynamic rendering - prevents caching which would skip view tracking
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata for the page
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  
  const form = await prisma.form.findFirst({
    where: { slug, isActive: true },
    select: { name: true, description: true },
  });

  if (!form) {
    return { title: "Form Not Found" };
  }

  return {
    title: `${form.name} | Y-CRM`,
    description: form.description || "Submit your information",
  };
}

export default async function PublicFormPage({ params }: PageProps) {
  const { slug } = await params;

  // Fetch form
  const form = await prisma.form.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      fields: true,
      settings: true,
    },
  });

  if (!form) {
    notFound();
  }

  // Increment view count atomically (server-side)
  try {
    await prisma.form.update({
      where: { id: form.id },
      data: { views: { increment: 1 } },
    });
  } catch (error) {
    console.error("Failed to increment form views:", error);
  }

  const fields = form.fields as Array<{
    id: string;
    type: string;
    label: string;
    required: boolean;
    placeholder?: string;
    options?: string[];
  }>;

  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardContent className="p-8">
        <PublicFormRenderer
          formId={form.id}
          slug={slug}
          name={form.name}
          description={form.description || undefined}
          fields={fields}
          showPoweredBy={true}
        />
      </CardContent>
    </Card>
  );
}
