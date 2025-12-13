/**
 * Gmail API Service
 * Send, read, and manage emails via Gmail API
 */

import { getValidAccessToken } from "./oauth";

const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1";

export interface EmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  body?: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  isHtml?: boolean;
}

export interface EmailSearchParams {
  query?: string;
  maxResults?: number;
  labelIds?: string[];
}

/**
 * Gmail API client for an organization
 */
export class GmailClient {
  private orgId: string;
  
  constructor(orgId: string) {
    this.orgId = orgId;
  }
  
  /**
   * Make authenticated request to Gmail API
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const accessToken = await getValidAccessToken(this.orgId);
    
    if (!accessToken) {
      throw new Error("Google not connected. Please connect Google in Settings > Integrations.");
    }
    
    const url = `${GMAIL_API_BASE}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`[Gmail API] Error:`, error);
      throw new Error(`Gmail API Error: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * Get user's email address
   */
  async getProfile(): Promise<{ emailAddress: string; messagesTotal: number; threadsTotal: number }> {
    return this.request("GET", "/users/me/profile");
  }
  
  /**
   * Send an email
   */
  async sendEmail(params: SendEmailParams): Promise<{ id: string; threadId: string }> {
    const { to, subject, body, cc, bcc, isHtml = false } = params;
    
    // Build MIME message
    const boundary = "boundary_" + Date.now();
    const mimeType = isHtml ? "text/html" : "text/plain";
    
    let message = [
      `To: ${to}`,
      cc ? `Cc: ${cc}` : "",
      bcc ? `Bcc: ${bcc}` : "",
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: ${mimeType}; charset=utf-8`,
      "",
      body,
    ]
      .filter(Boolean)
      .join("\r\n");
    
    // Base64url encode the message
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    
    return this.request("POST", "/users/me/messages/send", {
      raw: encodedMessage,
    });
  }
  
  /**
   * List emails
   */
  async listEmails(params: EmailSearchParams = {}): Promise<EmailMessage[]> {
    const { query, maxResults = 10, labelIds } = params;
    
    let endpoint = `/users/me/messages?maxResults=${maxResults}`;
    if (query) endpoint += `&q=${encodeURIComponent(query)}`;
    if (labelIds?.length) endpoint += `&labelIds=${labelIds.join(",")}`;
    
    const response = await this.request<{ messages?: { id: string; threadId: string }[] }>(
      "GET",
      endpoint
    );
    
    if (!response.messages?.length) {
      return [];
    }
    
    // Fetch full message details
    const emails: EmailMessage[] = [];
    for (const msg of response.messages.slice(0, maxResults)) {
      try {
        const full = await this.getMessage(msg.id);
        emails.push(full);
      } catch (error) {
        console.error(`[Gmail] Failed to fetch message ${msg.id}:`, error);
      }
    }
    
    return emails;
  }
  
  /**
   * Get a single email message
   */
  async getMessage(messageId: string): Promise<EmailMessage> {
    const response = await this.request<{
      id: string;
      threadId: string;
      snippet: string;
      payload: {
        headers: { name: string; value: string }[];
        body?: { data?: string };
        parts?: { mimeType: string; body?: { data?: string } }[];
      };
    }>("GET", `/users/me/messages/${messageId}`);
    
    const headers = response.payload.headers;
    const getHeader = (name: string) => 
      headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value;
    
    // Extract body
    let body = "";
    if (response.payload.body?.data) {
      body = Buffer.from(response.payload.body.data, "base64").toString("utf-8");
    } else if (response.payload.parts) {
      const textPart = response.payload.parts.find(
        p => p.mimeType === "text/plain" || p.mimeType === "text/html"
      );
      if (textPart?.body?.data) {
        body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
      }
    }
    
    return {
      id: response.id,
      threadId: response.threadId,
      snippet: response.snippet,
      subject: getHeader("Subject"),
      from: getHeader("From"),
      to: getHeader("To"),
      date: getHeader("Date"),
      body,
    };
  }
  
  /**
   * Search emails
   */
  async searchEmails(query: string, maxResults: number = 10): Promise<EmailMessage[]> {
    return this.listEmails({ query, maxResults });
  }
  
  /**
   * Get unread emails
   */
  async getUnreadEmails(maxResults: number = 10): Promise<EmailMessage[]> {
    return this.listEmails({ query: "is:unread", maxResults });
  }
  
  /**
   * Get emails from a specific sender
   */
  async getEmailsFrom(email: string, maxResults: number = 10): Promise<EmailMessage[]> {
    return this.listEmails({ query: `from:${email}`, maxResults });
  }
  
  /**
   * Reply to an email thread
   */
  async replyToThread(
    threadId: string,
    originalMessageId: string,
    params: Omit<SendEmailParams, "to"> & { to?: string }
  ): Promise<{ id: string; threadId: string }> {
    // Get original message to extract headers
    const original = await this.getMessage(originalMessageId);
    
    const to = params.to || original.from || "";
    const subject = params.subject.startsWith("Re:") 
      ? params.subject 
      : `Re: ${params.subject}`;
    
    // Build MIME message with thread references
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      `In-Reply-To: ${originalMessageId}`,
      `References: ${originalMessageId}`,
      `MIME-Version: 1.0`,
      `Content-Type: ${params.isHtml ? "text/html" : "text/plain"}; charset=utf-8`,
      "",
      params.body,
    ].join("\r\n");
    
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    
    return this.request("POST", "/users/me/messages/send", {
      raw: encodedMessage,
      threadId,
    });
  }
  
  /**
   * Create a draft email
   */
  async createDraft(params: SendEmailParams): Promise<{ id: string; message: { id: string } }> {
    const { to, subject, body, cc, bcc, isHtml = false } = params;
    
    const message = [
      `To: ${to}`,
      cc ? `Cc: ${cc}` : "",
      bcc ? `Bcc: ${bcc}` : "",
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: ${isHtml ? "text/html" : "text/plain"}; charset=utf-8`,
      "",
      body,
    ]
      .filter(Boolean)
      .join("\r\n");
    
    const encodedMessage = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    
    return this.request("POST", "/users/me/drafts", {
      message: {
        raw: encodedMessage,
      },
    });
  }
  
  /**
   * List labels
   */
  async listLabels(): Promise<{ id: string; name: string; type: string }[]> {
    const response = await this.request<{ labels: { id: string; name: string; type: string }[] }>(
      "GET",
      "/users/me/labels"
    );
    return response.labels || [];
  }
}

/**
 * Create Gmail client for an organization
 */
export function createGmailClient(orgId: string): GmailClient {
  return new GmailClient(orgId);
}
