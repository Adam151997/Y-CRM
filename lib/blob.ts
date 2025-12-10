import { put, del, list } from "@vercel/blob";

/**
 * Vercel Blob Storage for Y CRM Documents
 * Replaces Cloudflare R2 with native Vercel integration
 */

/**
 * Upload a file to Vercel Blob
 */
export async function uploadToBlob(params: {
  file: Buffer | Blob | File;
  fileName: string;
  contentType: string;
  folder?: string;
}): Promise<{ success: boolean; key: string; url: string; error?: string }> {
  const { file, fileName, contentType, folder = "documents" } = params;

  // Generate unique path
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const pathname = `${folder}/${timestamp}-${sanitizedName}`;

  try {
    const blob = await put(pathname, file, {
      access: "public",
      contentType,
      addRandomSuffix: false,
    });

    return {
      success: true,
      key: pathname,
      url: blob.url,
    };
  } catch (error) {
    console.error("Blob upload error:", error);
    return {
      success: false,
      key: "",
      url: "",
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

/**
 * Delete a file from Vercel Blob
 */
export async function deleteFromBlob(url: string): Promise<boolean> {
  try {
    await del(url);
    return true;
  } catch (error) {
    console.error("Blob delete error:", error);
    return false;
  }
}

/**
 * List files in Vercel Blob (optional - for admin purposes)
 */
export async function listBlobs(prefix?: string) {
  try {
    const { blobs } = await list({ prefix });
    return blobs;
  } catch (error) {
    console.error("Blob list error:", error);
    return [];
  }
}

/**
 * Check if Vercel Blob is configured
 */
export function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Get file extension from mime type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "text/plain": "txt",
    "text/csv": "csv",
  };
  return mimeToExt[mimeType] || "bin";
}

/**
 * Check if file is viewable in browser
 */
export function isViewableInBrowser(mimeType: string): boolean {
  const viewable = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "text/plain",
    "text/csv",
  ];
  return viewable.includes(mimeType);
}

/**
 * Check if file can be viewed with Google Docs Viewer
 */
export function canUseGoogleViewer(mimeType: string): boolean {
  const supported = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];
  return supported.includes(mimeType);
}
