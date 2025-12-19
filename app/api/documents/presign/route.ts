import { NextRequest, NextResponse } from "next/server";
import { getApiAuthContext } from "@/lib/auth";
import { getPresignedUploadUrl, isR2Configured } from "@/lib/r2";
import { z } from "zod";

const presignSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().max(10 * 1024 * 1024), // 10MB max
});

// POST /api/documents/presign - Get presigned URL for file upload
export async function POST(request: NextRequest) {
  try {
    const auth = await getApiAuthContext();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if R2 is configured
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "File storage is not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validationResult = presignSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { fileName, fileType } = validationResult.data;

    // Generate presigned URL
    const { url, key } = await getPresignedUploadUrl({
      fileName,
      contentType: fileType,
      folder: `tickets/${auth.orgId}`,
    });

    // Construct the public URL for the file
    const publicUrl = process.env.R2_PUBLIC_URL 
      ? `${process.env.R2_PUBLIC_URL}/${key}`
      : url.split("?")[0]; // Fallback to the URL without query params

    return NextResponse.json({
      uploadUrl: url,
      fileUrl: publicUrl,
      fileKey: key,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 }
    );
  }
}
