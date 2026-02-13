import { supabase } from "../supabaseClient";

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
}

const CALENDAR_API =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

/**
 * Fetch today's Google Calendar events using the OAuth provider token
 * stored in the Supabase session. Returns `null` when the user has no
 * session or hasn't granted calendar access.
 */
export async function fetchTodayCalendarEvents(): Promise<CalendarEvent[] | null> {
  try {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !sessionData?.session?.provider_token) {
      return null;
    }

    const { provider_token } = sessionData.session;

    // Build a midnight-to-midnight window in the user's local timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const params = new URLSearchParams({
      timeMin: today.toISOString(),
      timeMax: tomorrow.toISOString(),
      orderBy: "startTime",
      singleEvents: "true",
    });

    const response = await fetch(`${CALENDAR_API}?${params}`, {
      headers: { Authorization: `Bearer ${provider_token}` },
    });

    if (!response.ok) {
      // 401/403 typically means the token expired or scope was revoked
      if (response.status === 401 || response.status === 403) {
        console.warn(
          `Calendar API ${response.status}: ${response.statusText}`,
        );
        return null;
      }
      throw new Error(`Calendar API error: ${response.statusText}`);
    }

    const data = await response.json();

    return ((data.items as Record<string, any>[]) ?? []).map(
      (event): CalendarEvent => ({
        id: event.id,
        summary: event.summary || "Unnamed Event",
        description: event.description,
        startTime: event.start.dateTime || event.start.date,
        endTime: event.end.dateTime || event.end.date,
        allDay: !event.start.dateTime,
      }),
    );
  } catch (error) {
    console.error("Failed to fetch calendar events:", error);
    return null;
  }
}
