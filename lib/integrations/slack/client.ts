/**
 * Slack API Client
 * Send messages, manage channels, and interact with Slack
 */

import { getSlackAccessToken } from "./oauth";

const SLACK_API_BASE = "https://slack.com/api";

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_private: boolean;
  is_member: boolean;
  num_members?: number;
}

export interface SlackUser {
  id: string;
  name: string;
  real_name: string;
  profile: {
    email?: string;
    display_name?: string;
    image_72?: string;
  };
}

export interface SlackMessage {
  ok: boolean;
  channel: string;
  ts: string;
  message?: {
    text: string;
    user: string;
    ts: string;
  };
}

export interface SendMessageParams {
  channel: string;  // Channel ID or name
  text: string;
  blocks?: unknown[];  // Slack Block Kit blocks
  threadTs?: string;   // For threaded replies
}

/**
 * Slack API client
 */
export class SlackClient {
  private orgId: string;
  
  constructor(orgId: string) {
    this.orgId = orgId;
  }
  
  /**
   * Make authenticated request to Slack API
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown
  ): Promise<T> {
    const accessToken = await getSlackAccessToken(this.orgId);
    
    if (!accessToken) {
      throw new Error("Slack not connected. Please connect Slack in Settings > Integrations.");
    }
    
    const url = `${SLACK_API_BASE}${endpoint}`;
    
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
    const data = await response.json();
    
    if (!data.ok) {
      console.error(`[Slack API] Error:`, data.error);
      throw new Error(`Slack API Error: ${data.error}`);
    }
    
    return data;
  }
  
  /**
   * Send a message to a channel or user
   */
  async sendMessage(params: SendMessageParams): Promise<SlackMessage> {
    const { channel, text, blocks, threadTs } = params;
    
    const body: Record<string, unknown> = {
      channel,
      text,
    };
    
    if (blocks) {
      body.blocks = blocks;
    }
    
    if (threadTs) {
      body.thread_ts = threadTs;
    }
    
    return this.request<SlackMessage>("POST", "/chat.postMessage", body);
  }
  
  /**
   * Send a direct message to a user by email
   */
  async sendDirectMessage(email: string, text: string): Promise<SlackMessage> {
    // Find user by email
    const user = await this.findUserByEmail(email);
    
    if (!user) {
      throw new Error(`User with email ${email} not found in Slack`);
    }
    
    // Open DM channel
    const dmChannel = await this.openDirectMessage(user.id);
    
    // Send message
    return this.sendMessage({
      channel: dmChannel.channel.id,
      text,
    });
  }
  
  /**
   * List channels
   */
  async listChannels(limit: number = 100, includePrivate: boolean = false): Promise<SlackChannel[]> {
    const types = includePrivate ? "public_channel,private_channel" : "public_channel";
    
    const response = await this.request<{ channels: SlackChannel[] }>(
      "GET",
      `/conversations.list?types=${types}&exclude_archived=true&limit=${limit}`
    );
    
    return response.channels || [];
  }
  
  /**
   * Find channel by name
   */
  async findChannelByName(name: string): Promise<SlackChannel | null> {
    const channels = await this.listChannels(true);
    const normalizedName = name.replace(/^#/, "").toLowerCase();
    
    return channels.find(c => c.name.toLowerCase() === normalizedName) || null;
  }
  
  /**
   * List users
   */
  async listUsers(): Promise<SlackUser[]> {
    const response = await this.request<{ members: SlackUser[] }>(
      "GET",
      "/users.list?limit=200"
    );
    
    return response.members || [];
  }
  
  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<SlackUser | null> {
    try {
      const response = await this.request<{ user: SlackUser }>(
        "GET",
        `/users.lookupByEmail?email=${encodeURIComponent(email)}`
      );
      
      return response.user;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Open a direct message channel
   */
  async openDirectMessage(userId: string): Promise<{ channel: { id: string } }> {
    return this.request<{ channel: { id: string } }>(
      "POST",
      "/conversations.open",
      { users: userId }
    );
  }
  
  /**
   * Get team info
   */
  async getTeamInfo(): Promise<{ id: string; name: string; domain: string }> {
    const response = await this.request<{ team: { id: string; name: string; domain: string } }>(
      "GET",
      "/team.info"
    );
    
    return response.team;
  }
  
  /**
   * Get channel info
   */
  async getChannelInfo(channelId: string): Promise<SlackChannel> {
    const response = await this.request<{ channel: SlackChannel }>(
      "GET",
      `/conversations.info?channel=${channelId}`
    );
    
    return response.channel;
  }
  
  /**
   * Get channel history
   */
  async getChannelHistory(
    channelId: string,
    limit: number = 10
  ): Promise<{ messages: { text: string; user: string; ts: string }[] }> {
    return this.request<{ messages: { text: string; user: string; ts: string }[] }>(
      "GET",
      `/conversations.history?channel=${channelId}&limit=${limit}`
    );
  }
  
  /**
   * Update a message
   */
  async updateMessage(
    channel: string,
    ts: string,
    text: string
  ): Promise<SlackMessage> {
    return this.request<SlackMessage>("POST", "/chat.update", {
      channel,
      ts,
      text,
    });
  }
  
  /**
   * Delete a message
   */
  async deleteMessage(channel: string, ts: string): Promise<void> {
    await this.request("POST", "/chat.delete", {
      channel,
      ts,
    });
  }
  
  /**
   * Add reaction to a message
   */
  async addReaction(channel: string, ts: string, emoji: string): Promise<void> {
    await this.request("POST", "/reactions.add", {
      channel,
      timestamp: ts,
      name: emoji.replace(/:/g, ""),
    });
  }
  
  /**
   * Test authentication
   */
  async testAuth(): Promise<{ ok: boolean; user: string; team: string }> {
    return this.request<{ ok: boolean; user: string; team: string }>(
      "GET",
      "/auth.test"
    );
  }
}

/**
 * Create Slack client for an organization
 */
export function createSlackClient(orgId: string): SlackClient {
  return new SlackClient(orgId);
}
