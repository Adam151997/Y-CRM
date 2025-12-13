/**
 * Google Calendar API Service
 * Create, read, and manage calendar events
 */

import { getValidAccessToken } from "./oauth";

const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: { email: string; displayName?: string; responseStatus?: string }[];
  hangoutLink?: string;
  htmlLink?: string;
  status?: string;
  creator?: { email: string };
  organizer?: { email: string };
}

export interface CreateEventParams {
  summary: string;
  description?: string;
  location?: string;
  startDateTime: string;  // ISO format
  endDateTime: string;    // ISO format
  timeZone?: string;
  attendees?: string[];   // Email addresses
  addMeetLink?: boolean;
}

export interface ListEventsParams {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
  singleEvents?: boolean;
  orderBy?: "startTime" | "updated";
}

/**
 * Google Calendar API client
 */
export class CalendarClient {
  private orgId: string;
  
  constructor(orgId: string) {
    this.orgId = orgId;
  }
  
  /**
   * Make authenticated request to Calendar API
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
    
    const url = `${CALENDAR_API_BASE}${endpoint}`;
    
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
      console.error(`[Calendar API] Error:`, error);
      throw new Error(`Calendar API Error: ${response.status}`);
    }
    
    return response.json();
  }
  
  /**
   * List calendars
   */
  async listCalendars(): Promise<{ id: string; summary: string; primary?: boolean }[]> {
    const response = await this.request<{ items: { id: string; summary: string; primary?: boolean }[] }>(
      "GET",
      "/users/me/calendarList"
    );
    return response.items || [];
  }
  
  /**
   * Create a calendar event
   */
  async createEvent(params: CreateEventParams): Promise<CalendarEvent> {
    const {
      summary,
      description,
      location,
      startDateTime,
      endDateTime,
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
      attendees,
      addMeetLink = false,
    } = params;
    
    const eventBody: Record<string, unknown> = {
      summary,
      description,
      location,
      start: {
        dateTime: startDateTime,
        timeZone,
      },
      end: {
        dateTime: endDateTime,
        timeZone,
      },
    };
    
    if (attendees?.length) {
      eventBody.attendees = attendees.map(email => ({ email }));
    }
    
    // Add Google Meet link
    if (addMeetLink) {
      eventBody.conferenceData = {
        createRequest: {
          requestId: `meet_${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      };
    }
    
    const endpoint = addMeetLink
      ? "/calendars/primary/events?conferenceDataVersion=1"
      : "/calendars/primary/events";
    
    return this.request<CalendarEvent>("POST", endpoint, eventBody);
  }
  
  /**
   * List events
   */
  async listEvents(params: ListEventsParams = {}): Promise<CalendarEvent[]> {
    const {
      calendarId = "primary",
      timeMin = new Date().toISOString(),
      timeMax,
      maxResults = 10,
      singleEvents = true,
      orderBy = "startTime",
    } = params;
    
    let endpoint = `/calendars/${calendarId}/events?`;
    endpoint += `timeMin=${encodeURIComponent(timeMin)}`;
    endpoint += `&maxResults=${maxResults}`;
    endpoint += `&singleEvents=${singleEvents}`;
    endpoint += `&orderBy=${orderBy}`;
    
    if (timeMax) {
      endpoint += `&timeMax=${encodeURIComponent(timeMax)}`;
    }
    
    const response = await this.request<{ items: CalendarEvent[] }>("GET", endpoint);
    return response.items || [];
  }
  
  /**
   * Get a single event
   */
  async getEvent(eventId: string, calendarId: string = "primary"): Promise<CalendarEvent> {
    return this.request<CalendarEvent>("GET", `/calendars/${calendarId}/events/${eventId}`);
  }
  
  /**
   * Update an event
   */
  async updateEvent(
    eventId: string,
    updates: Partial<CreateEventParams>,
    calendarId: string = "primary"
  ): Promise<CalendarEvent> {
    const existing = await this.getEvent(eventId, calendarId);
    
    const eventBody: Record<string, unknown> = {
      ...existing,
    };
    
    if (updates.summary) eventBody.summary = updates.summary;
    if (updates.description) eventBody.description = updates.description;
    if (updates.location) eventBody.location = updates.location;
    if (updates.startDateTime) {
      eventBody.start = {
        dateTime: updates.startDateTime,
        timeZone: updates.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }
    if (updates.endDateTime) {
      eventBody.end = {
        dateTime: updates.endDateTime,
        timeZone: updates.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }
    if (updates.attendees) {
      eventBody.attendees = updates.attendees.map(email => ({ email }));
    }
    
    return this.request<CalendarEvent>(
      "PUT",
      `/calendars/${calendarId}/events/${eventId}`,
      eventBody
    );
  }
  
  /**
   * Delete an event
   */
  async deleteEvent(eventId: string, calendarId: string = "primary"): Promise<void> {
    await this.request("DELETE", `/calendars/${calendarId}/events/${eventId}`);
  }
  
  /**
   * Get today's events
   */
  async getTodayEvents(): Promise<CalendarEvent[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.listEvents({
      timeMin: today.toISOString(),
      timeMax: tomorrow.toISOString(),
      maxResults: 50,
    });
  }
  
  /**
   * Get upcoming events (next 7 days)
   */
  async getUpcomingEvents(days: number = 7): Promise<CalendarEvent[]> {
    const now = new Date();
    const future = new Date(now);
    future.setDate(future.getDate() + days);
    
    return this.listEvents({
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      maxResults: 50,
    });
  }
  
  /**
   * Quick add event using natural language
   */
  async quickAddEvent(text: string, calendarId: string = "primary"): Promise<CalendarEvent> {
    return this.request<CalendarEvent>(
      "POST",
      `/calendars/${calendarId}/events/quickAdd?text=${encodeURIComponent(text)}`
    );
  }
  
  /**
   * Check free/busy status
   */
  async getFreeBusy(
    timeMin: string,
    timeMax: string,
    calendars: string[] = ["primary"]
  ): Promise<Record<string, { busy: { start: string; end: string }[] }>> {
    const response = await this.request<{
      calendars: Record<string, { busy: { start: string; end: string }[] }>;
    }>("POST", "/freeBusy", {
      timeMin,
      timeMax,
      items: calendars.map(id => ({ id })),
    });
    
    return response.calendars;
  }
}

/**
 * Create Calendar client for an organization
 */
export function createCalendarClient(orgId: string): CalendarClient {
  return new CalendarClient(orgId);
}
