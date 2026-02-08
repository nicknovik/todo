import { Calendar, Lock } from "lucide-react";
import { signInWithGoogle } from "../auth";
import { CalendarEvent } from "../googleCalendarService";

interface CalendarEventsProps {
  events: CalendarEvent[] | null; // null = haven't checked/don't have access, [] = have access but no events
  onAddCalendarAccess?: () => void;
}

function formatTime(isoString: string, allDay: boolean): string {
  if (allDay) {
    return "All day";
  }
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function CalendarEvents({ events, onAddCalendarAccess }: CalendarEventsProps) {
  // No calendar access yet - show dummy view with request button
  if (events === null) {
    return (
      <div className="mb-4 border border-zinc-300 rounded-lg p-4 bg-zinc-100 opacity-60">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-zinc-400" />
          <h3 className="text-xs font-semibold text-zinc-500">Google Calendar</h3>
        </div>
        <p className="text-xs text-zinc-500 mb-3">
          Connect your Google Calendar to see your events here.
        </p>
        <button
          onClick={async () => {
            await signInWithGoogle();
            onAddCalendarAccess?.();
          }}
          className="flex items-center gap-2 px-3 py-2 rounded bg-zinc-200 text-zinc-700 hover:bg-zinc-300 text-xs font-medium"
        >
          <Lock className="h-3 w-3" />
          Connect Google Calendar
        </button>
      </div>
    );
  }

  // Have calendar access but no events
  if (events.length === 0) {
    return null;
  }

  // Have events - display them
  return (
    <div className="mb-4 space-y-2">
      <div className="flex items-center gap-2 px-2">
        <Calendar className="h-4 w-4 text-blue-600" />
        <h3 className="text-xs font-semibold text-blue-700">📅 Today's Events</h3>
      </div>
      <div className="space-y-2">
        {events.map((event) => (
          <div
            key={event.id}
            className="border border-blue-200 rounded-lg p-3 bg-blue-50 flex flex-col gap-1"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-medium text-sm text-blue-900 flex-1">
                {event.summary}
              </h4>
            </div>
            <p className="text-xs text-blue-700">
              {formatTime(event.startTime, event.allDay)}
              {!event.allDay && ` - ${formatTime(event.endTime, event.allDay)}`}
            </p>
            {event.description && (
              <p className="text-xs text-blue-600 line-clamp-2">
                {event.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
