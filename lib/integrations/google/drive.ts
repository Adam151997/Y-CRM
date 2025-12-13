/**
 * Google Drive API Service
 * Upload, download, and manage files in Google Drive
 */

import { getValidAccessToken } from "./oauth";

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
  thumbnailLink?: string;
}

export interface CreateFileParams {
  name: string;
  content: string;
  mimeType?: string;
  folderId?: string;
}

export interface CreateFolderParams {
  name: string;
  parentId?: string;
}

export interface ListFilesParams {
  query?: string;
  pageSize?: number;
  folderId?: string;
  mimeType?: string;
}

/**
 * Google Drive API client
 */
export class DriveClient {
  private orgId: string;
  
  constructor(orgId: string) {
    this.orgId = orgId;
  }
  
  /**
   * Make authenticated request to Drive API
   */
  private async request<T>(
    method: string,
    baseUrl: string,
    endpoint: string,
    body?: unknown,
    contentType?: string
  ): Promise<T> {
    const accessToken = await getValidAccessToken(this.orgId);
    
    if (!accessToken) {
      throw new Error("Google not connected. Please connect Google in Settings > Integrations.");
    }
    
    const url = `${baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };
    
    if (contentType) {
      headers["Content-Type"] = contentType;
    } else if (body) {
      headers["Content-Type"] = "application/json";
    }
    
    const options: RequestInit = {
      method,
      headers,
    };
    
    if (body) {
      options.body = typeof body === "string" ? body : JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`[Drive API] Error:`, error);
      throw new Error(`Drive API Error: ${response.status}`);
    }
    
    // Some endpoints return empty response
    const text = await response.text();
    return text ? JSON.parse(text) : {} as T;
  }
  
  /**
   * List files
   */
  async listFiles(params: ListFilesParams = {}): Promise<DriveFile[]> {
    const { query, pageSize = 20, folderId, mimeType } = params;
    
    const queryParts: string[] = [];
    
    if (query) queryParts.push(query);
    if (folderId) queryParts.push(`'${folderId}' in parents`);
    if (mimeType) queryParts.push(`mimeType='${mimeType}'`);
    queryParts.push("trashed=false");
    
    let endpoint = `/files?pageSize=${pageSize}`;
    endpoint += `&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,parents,thumbnailLink)`;
    
    if (queryParts.length) {
      endpoint += `&q=${encodeURIComponent(queryParts.join(" and "))}`;
    }
    
    const response = await this.request<{ files: DriveFile[] }>(
      "GET",
      DRIVE_API_BASE,
      endpoint
    );
    
    return response.files || [];
  }
  
  /**
   * Search files by name
   */
  async searchFiles(name: string, maxResults: number = 10): Promise<DriveFile[]> {
    return this.listFiles({
      query: `name contains '${name}'`,
      pageSize: maxResults,
    });
  }
  
  /**
   * Get file metadata
   */
  async getFile(fileId: string): Promise<DriveFile> {
    return this.request<DriveFile>(
      "GET",
      DRIVE_API_BASE,
      `/files/${fileId}?fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,parents`
    );
  }
  
  /**
   * Create a text file
   */
  async createTextFile(params: CreateFileParams): Promise<DriveFile> {
    const { name, content, mimeType = "text/plain", folderId } = params;
    
    const metadata: Record<string, unknown> = {
      name,
      mimeType,
    };
    
    if (folderId) {
      metadata.parents = [folderId];
    }
    
    // Multipart upload
    const boundary = "-------" + Date.now();
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;
    
    const body = 
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n\r\n` +
      content +
      closeDelimiter;
    
    return this.request<DriveFile>(
      "POST",
      DRIVE_UPLOAD_BASE,
      "/files?uploadType=multipart&fields=id,name,mimeType,webViewLink",
      body,
      `multipart/related; boundary=${boundary}`
    );
  }
  
  /**
   * Create a folder
   */
  async createFolder(params: CreateFolderParams): Promise<DriveFile> {
    const { name, parentId } = params;
    
    const metadata: Record<string, unknown> = {
      name,
      mimeType: "application/vnd.google-apps.folder",
    };
    
    if (parentId) {
      metadata.parents = [parentId];
    }
    
    return this.request<DriveFile>(
      "POST",
      DRIVE_API_BASE,
      "/files?fields=id,name,mimeType,webViewLink",
      metadata
    );
  }
  
  /**
   * Create a Google Doc
   */
  async createGoogleDoc(name: string, content?: string, folderId?: string): Promise<DriveFile> {
    const metadata: Record<string, unknown> = {
      name,
      mimeType: "application/vnd.google-apps.document",
    };
    
    if (folderId) {
      metadata.parents = [folderId];
    }
    
    // Create empty doc first
    const doc = await this.request<DriveFile>(
      "POST",
      DRIVE_API_BASE,
      "/files?fields=id,name,mimeType,webViewLink",
      metadata
    );
    
    // If content provided, update via Docs API
    if (content && doc.id) {
      await this.updateDocContent(doc.id, content);
    }
    
    return doc;
  }
  
  /**
   * Update Google Doc content via Docs API
   */
  private async updateDocContent(docId: string, content: string): Promise<void> {
    const accessToken = await getValidAccessToken(this.orgId);
    
    if (!accessToken) return;
    
    // First, get the document to find end of content
    const docResponse = await fetch(
      `https://docs.googleapis.com/v1/documents/${docId}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    
    if (!docResponse.ok) return;
    
    // Insert content at the beginning
    await fetch(
      `https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: content,
              },
            },
          ],
        }),
      }
    );
  }
  
  /**
   * Create a Google Sheet
   */
  async createGoogleSheet(name: string, folderId?: string): Promise<DriveFile> {
    const metadata: Record<string, unknown> = {
      name,
      mimeType: "application/vnd.google-apps.spreadsheet",
    };
    
    if (folderId) {
      metadata.parents = [folderId];
    }
    
    return this.request<DriveFile>(
      "POST",
      DRIVE_API_BASE,
      "/files?fields=id,name,mimeType,webViewLink",
      metadata
    );
  }
  
  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    await this.request("DELETE", DRIVE_API_BASE, `/files/${fileId}`);
  }
  
  /**
   * Move file to trash
   */
  async trashFile(fileId: string): Promise<DriveFile> {
    return this.request<DriveFile>(
      "PATCH",
      DRIVE_API_BASE,
      `/files/${fileId}`,
      { trashed: true }
    );
  }
  
  /**
   * Share a file
   */
  async shareFile(
    fileId: string,
    email: string,
    role: "reader" | "writer" | "commenter" = "reader"
  ): Promise<void> {
    await this.request(
      "POST",
      DRIVE_API_BASE,
      `/files/${fileId}/permissions`,
      {
        type: "user",
        role,
        emailAddress: email,
      }
    );
  }
  
  /**
   * Get storage quota
   */
  async getStorageQuota(): Promise<{ limit: string; usage: string; usageInDrive: string }> {
    const response = await this.request<{
      storageQuota: { limit: string; usage: string; usageInDrive: string };
    }>("GET", DRIVE_API_BASE, "/about?fields=storageQuota");
    
    return response.storageQuota;
  }
  
  /**
   * List recent files
   */
  async getRecentFiles(maxResults: number = 10): Promise<DriveFile[]> {
    return this.listFiles({
      query: "modifiedTime > '" + new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() + "'",
      pageSize: maxResults,
    });
  }
  
  /**
   * List files in a folder
   */
  async listFilesInFolder(folderId: string, maxResults: number = 50): Promise<DriveFile[]> {
    return this.listFiles({
      folderId,
      pageSize: maxResults,
    });
  }
}

/**
 * Create Drive client for an organization
 */
export function createDriveClient(orgId: string): DriveClient {
  return new DriveClient(orgId);
}
