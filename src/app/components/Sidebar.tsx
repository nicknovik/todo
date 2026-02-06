import { Calendar, Inbox } from "lucide-react";

interface SidebarProps {
  currentView: "today" | "backlog";
  onViewChange: (view: "today" | "backlog") => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <div className="w-64 border-r border-zinc-200 bg-white h-full p-6">
      <h1 className="text-xl font-semibold text-zinc-900 mb-8">Tasks</h1>
      <nav className="space-y-1">
        <button
          onClick={() => onViewChange("today")}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            currentView === "today"
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <Calendar className="h-5 w-5" />
          <span>Today</span>
        </button>
        <button
          onClick={() => onViewChange("backlog")}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            currentView === "backlog"
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <Inbox className="h-5 w-5" />
          <span>Backlog</span>
        </button>
      </nav>
    </div>
  );
}
