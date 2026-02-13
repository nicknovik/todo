/** Shared type definitions for the todo application. */

export type ViewType = "today" | "backlog" | "recentlyDeleted";

export type Priority = "" | "!" | "!!" | "!!!";

export interface Todo {
  id: string;
  summary: string;
  description: string;
  completed: boolean;
  category: "today" | "backlog";
  dueDate: string;
  starred: boolean;
  repeatDays: number;
  group: string;
  priority: Priority;
  order: number;
  completedAt?: string;
  deletedAt?: string | null;
  recurringParentId?: string | null;
}

/** Numeric priority values for sort comparisons. Higher = more urgent. */
export const PRIORITY_VALUES: Record<Priority, number> = {
  "!!!": 3,
  "!!": 2,
  "!": 1,
  "": 0,
};

/** All priority levels in cycle order (for toggling). */
export const PRIORITY_CYCLE: Priority[] = ["", "!", "!!", "!!!"];

/**
 * The display name used for todos that have no explicit group.
 * Stored as "" in the database but displayed as "Ungrouped" in the UI.
 */
export const UNGROUPED = "Ungrouped";

/** Normalize a todo's group value to its display name. */
export function displayGroup(group: string): string {
  return group || UNGROUPED;
}

/** Convert a display group name back to the stored value. */
export function storedGroup(displayName: string): string {
  return displayName === UNGROUPED ? "" : displayName;
}
