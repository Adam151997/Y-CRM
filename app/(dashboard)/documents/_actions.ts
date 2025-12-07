"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getAuthContext } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { deleteFromR2 } from "@/lib/r2";

interface CreateDocumentInput {
  name: string;
  type: string;
  fileUrl: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  leadId?: string;
  accountId?: string;
}

export async function createDocument(input: CreateDocumentInput) {
  try {
    const { orgId, userId } = await getAuthContext();

    const document = await prisma.document.create({
      data: {
        orgId,
        name: input.name,
        type: input.type,
        fileUrl: input.fileUrl,
        fileKey: input.fileKey,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        leadId: input.leadId || null,
        accountId: input.accountId || null,
        uploadedById: userId,
      },
    });

    await createAuditLog({
      orgId,
      action: "CREATE",
      module: "DOCUMENT",
      recordId: document.id,
      actorType: "USER",
      actorId: userId,
      newState: document as unknown as Record<string, unknown>,
    });

    revalidatePath("/documents");
    return { success: true, document };
  } catch (error) {
    console.error("Failed to create document:", error);
    return { success: false, error: "Failed to create document" };
  }
}

export async function deleteDocument(documentId: string) {
  try {
    const { orgId, userId } = await getAuthContext();

    const document = await prisma.document.findFirst({
      where: { id: documentId, orgId },
    });

    if (!document) {
      return { success: false, error: "Document not found" };
    }

    // Delete from R2
    await deleteFromR2(document.fileKey);

    // Delete from database
    await prisma.document.delete({
      where: { id: documentId },
    });

    await createAuditLog({
      orgId,
      action: "DELETE",
      module: "DOCUMENT",
      recordId: documentId,
      actorType: "USER",
      actorId: userId,
      previousState: document as unknown as Record<string, unknown>,
    });

    revalidatePath("/documents");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete document:", error);
    return { success: false, error: "Failed to delete document" };
  }
}

export async function getDocumentsByEntity(
  entityType: "lead" | "account",
  entityId: string
) {
  try {
    const { orgId } = await getAuthContext();

    const where =
      entityType === "lead"
        ? { orgId, leadId: entityId }
        : { orgId, accountId: entityId };

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return { success: true, documents };
  } catch (error) {
    console.error("Failed to get documents:", error);
    return { success: false, documents: [] };
  }
}
