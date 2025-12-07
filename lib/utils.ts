import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string,
  currency: string = "USD"
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      if (diffMinutes === 0) return "just now";
      return `${diffMinutes}m ago`;
    }
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return formatDate(d);
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function parseRelativeDate(relative: string): Date {
  const now = new Date();
  const lower = relative.toLowerCase().trim();

  if (lower === "today") return now;
  
  if (lower === "tomorrow") {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  
  if (lower === "next week") {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek;
  }

  // "in X days"
  const inDaysMatch = lower.match(/in (\d+) days?/);
  if (inDaysMatch) {
    const result = new Date(now);
    result.setDate(result.getDate() + parseInt(inDaysMatch[1]));
    return result;
  }

  // "in X hours"
  const inHoursMatch = lower.match(/in (\d+) hours?/);
  if (inHoursMatch) {
    const result = new Date(now);
    result.setHours(result.getHours() + parseInt(inHoursMatch[1]));
    return result;
  }

  // "next monday", "next tuesday", etc.
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const nextDayMatch = lower.match(/next (\w+)/);
  if (nextDayMatch) {
    const targetDay = dayNames.indexOf(nextDayMatch[1]);
    if (targetDay !== -1) {
      const currentDay = now.getDay();
      const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
      const result = new Date(now);
      result.setDate(result.getDate() + daysUntil);
      return result;
    }
  }

  // Handle time specifications like "tomorrow noon", "tomorrow at 2pm"
  let baseDate = new Date(now);
  
  if (lower.includes("tomorrow")) {
    baseDate.setDate(baseDate.getDate() + 1);
  }

  if (lower.includes("noon")) {
    baseDate.setHours(12, 0, 0, 0);
    return baseDate;
  }
  
  if (lower.includes("midnight")) {
    baseDate.setHours(0, 0, 0, 0);
    return baseDate;
  }

  // "at Xpm" or "at X:XX"
  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const isPM = timeMatch[3]?.toLowerCase() === "pm";

    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;

    baseDate.setHours(hours, minutes, 0, 0);
    return baseDate;
  }

  // Fallback: tomorrow at 9am
  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(9, 0, 0, 0);
  return fallback;
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function getInitials(firstName?: string, lastName?: string): string {
  const first = firstName?.charAt(0).toUpperCase() || "";
  const last = lastName?.charAt(0).toUpperCase() || "";
  return first + last || "?";
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
