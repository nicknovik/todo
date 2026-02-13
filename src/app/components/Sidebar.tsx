
import { Calendar, Inbox, Trash2 } from "lucide-react";
import type { ViewType } from "../types";

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  return (
    <div className="w-16 md:w-64 border-r border-zinc-200 bg-white h-full p-2 md:p-6">
      <h1 className="text-xl font-semibold text-zinc-900 mb-8 hidden md:block">Tasks</h1>
      <div className="md:hidden mb-8 text-center">
        <span className="text-2xl">📋</span>
      </div>
      <nav className="space-y-1">
        <button
          onClick={() => onViewChange("today")}
          className={`w-full flex items-center justify-center md:justify-start gap-3 px-3 py-2 rounded-lg transition-colors ${
            currentView === "today"
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <Calendar className="h-5 w-5" />
          <span className="hidden md:inline">Today</span>
        </button>
        <button
          onClick={() => onViewChange("backlog")}
          className={`w-full flex items-center justify-center md:justify-start gap-3 px-3 py-2 rounded-lg transition-colors ${
            currentView === "backlog"
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <Inbox className="h-5 w-5" />
          <span className="hidden md:inline">Backlog</span>
        </button>
        <button
          onClick={() => onViewChange("recentlyDeleted")}
          className={`w-full flex items-center justify-center md:justify-start gap-3 px-3 py-2 rounded-lg transition-colors ${
            currentView === "recentlyDeleted"
              ? "bg-zinc-900 text-white"
              : "text-zinc-600 hover:bg-zinc-100"
          }`}
        >
          <Trash2 className="h-5 w-5" />
          <span className="hidden md:inline">Recently deleted</span>
        </button>
      </nav>
    </div>
  );
}
