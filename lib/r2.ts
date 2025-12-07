import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 Client
 * R2 is S3-compatible, so we use the AWS SDK
 */
const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "y-crm-documents";
const PUBLIC_URL = process.env.R2_PUBLIC_URL || "";

/**
 * Upload a file to R2
 */
export async function uploadToR2(params: {
  file: Buffer;
  fileName: string;
  contentType: string;
  folder?: string;
}): Promise<{ success: boolean; key: string; url: string; error?: string }> {
  const { file, fileName, contentType, folder = "documents" } = params;

  // Generate unique key
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `${folder}/${timestamp}-${sanitizedName}`;

  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await r2Client.send(command);

    // Construct public URL
    const url = PUBLIC_URL ? `${PUBLIC_URL}/${key}` : `https://${BUCKET_NAME}.r2.cloudflarestorage.com/${key}`;

    return {
      success: true,
      key,
      url,
    };
  } catch (error) {
    console.error("R2 upload error:", error);
    return {
      success: false,
      key: "",
      url: "",
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Delete a file from R2
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
    return true;
  } catch (error) {
    console.error("R2 delete error:", error);
    return false;
  }
}

/**
 * Generate a presigned URL for direct upload (optional - for large files)
 */
export async function getPresignedUploadUrl(params: {
  fileName: string;
  contentType: string;
  folder?: string;
}): Promise<{ url: string; key: string }> {
  const { fileName, contentType, folder = "documents" } = params;

  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const key = `${folder}/${timestamp}-${sanitizedName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(r2Client, command, { expiresIn: 3600 });

  return { url, key };
}

/**
 * Generate a presigned URL for download (for private files)
 */
export async function getPresignedDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(r2Client, command, { expiresIn: 3600 });
}

/**
 * Check if R2 is configured
 */
export function isR2Configured(): boolean {
  return !!(
    process.env.R2_ENDPOINT &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY
  );
}
