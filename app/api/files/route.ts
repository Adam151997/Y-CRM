/**
 * File Upload API
 * POST /api/files/upload - Upload a file to Vercel Blob storage
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getApiAuthContext } from "@/lib/auth";

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_TYPES = [
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

/**
 * POST /api/files/upload
 * Upload a file and return the URL
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)` },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Allowed types: PDF, Word, Excel, PowerPoint, images, text files." },
        { status: 400 }
      );
    }

    // Generate unique filename with org prefix
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const pathname = `${auth.orgId}/${timestamp}-${sanitizedName}`;

    // Upload to Vercel Blob
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: false,
    });

    // Return file info
    return NextResponse.json({
      url: blob.url,
      name: file.name,
      size: file.size,
      type: file.type,
      key: pathname,
      uploadedAt: new Date().toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error("[File Upload] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/files/upload
 * Delete a file from Vercel Blob storage
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 });
    }

    // Verify the URL belongs to this org (check pathname starts with orgId)
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      if (!pathname.includes(auth.orgId)) {
        return NextResponse.json({ error: "Unauthorized to delete this file" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Delete from Vercel Blob
    await del(url);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[File Delete] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete file" },
      { status: 500 }
    );
  }
}
