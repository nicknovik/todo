import { supabase } from "../supabaseClient";

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
}

export async function fetchTodayCalendarEvents(): Promise<CalendarEvent[] | null> {
  try {
    // Get the current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error("Session error:", sessionError);
      return null;
    }
    
    const session = sessionData?.session;

    if (!session) {
      // No session
      return null;
    }

    if (!session.provider_token) {
      // User hasn't granted calendar access
      return null;
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeMin = today.toISOString();
    const timeMax = tomorrow.toISOString();

    // Fetch events from Google Calendar API
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(timeMin)}&` +
      `timeMax=${encodeURIComponent(timeMax)}&` +
      `orderBy=startTime&` +
      `singleEvents=true`,
      {
        headers: {
          Authorization: `Bearer ${session.provider_token}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        // Token expired or no permission
        console.warn(`Calendar API returned ${response.status}: ${response.statusText}`);
        return null;
      }
      throw new Error(`Failed to fetch calendar events: ${response.statusText}`);
    }

    const data = await response.json();
    const events = data.items || [];

    return events.map((event: any) => ({
      id: event.id,
      summary: event.summary || "Unnamed Event",
      description: event.description,
      startTime: event.start.dateTime || event.start.date,
      endTime: event.end.dateTime || event.end.date,
      allDay: !event.start.dateTime,
    }));
  } catch (error) {
    console.error("Failed to fetch calendar events:", error);
    return null;
  }
}

export async function hasCalendarAccess(): Promise<boolean> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData?.session;
    return !!session?.provider_token;
  } catch {
    return false;
  }
}
