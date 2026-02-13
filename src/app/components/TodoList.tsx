import { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import type { Todo, ViewType } from "../types";
import { PRIORITY_VALUES, displayGroup } from "../types";
import { DraggableTodoItem } from "./DraggableTodoItem";
import { DraggableGroupHeader } from "./DraggableGroupHeader";
import { TodoDropZone } from "./TodoDropZone";
import { GroupDropZone } from "./GroupDropZone";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { TodoItem } from "./TodoItem";
import { CalendarEvents } from "./CalendarEvents";
import type { CalendarEvent } from "../googleCalendarService";

// ── Props ──────────────────────────────────────────────────────────────

interface TodoListProps {
  todos: Todo[];
  view: ViewType;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (text: string, category: "today" | "backlog") => void;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
  onMove: (dragId: string, hoverId: string, dragGroup: string, hoverGroup: string) => void;
  onMoveGroup?: (dragGroup: string, hoverGroup: string, insertAfter?: boolean) => void;
  onRenameGroup?: (oldName: string, newName: string) => void;
  groupOrder?: string[];
  calendarEvents?: CalendarEvent[] | null;
  onRefreshCalendar?: () => void;
}

// ── Sorting helpers ────────────────────────────────────────────────────

/** Returns the position index of `group` in the user's ordering (or Infinity). */
function groupRank(group: string, order: string[] | undefined): number {
  if (!order?.length) return Infinity;
  const idx = order.indexOf(group);
  return idx === -1 ? Infinity : idx;
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

/** Sort comparator: priority → group rank → item order. */
function byPriorityGroupOrder(
  a: Todo,
  b: Todo,
  order: string[] | undefined,
): number {
  const pDiff = PRIORITY_VALUES[b.priority] - PRIORITY_VALUES[a.priority];
  if (pDiff !== 0) return pDiff;

  const gDiff = groupRank(displayGroup(a.group), order) - groupRank(displayGroup(b.group), order);
  if (gDiff !== 0) return gDiff;

  return a.order - b.order;
}

/** Group an array of todos by their display group name. */
function groupByName(items: Todo[]): Record<string, Todo[]> {
  const groups: Record<string, Todo[]> = {};
  for (const todo of items) {
    const name = displayGroup(todo.group);
    (groups[name] ??= []).push(todo);
  }
  // Sort each group's items by order
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.order - b.order);
  }
  return groups;
}

/** Sort group keys according to the saved group order. */
function sortGroupKeys(
  groups: Record<string, Todo[]>,
  order: string[] | undefined,
): string[] {
  return [...Object.keys(groups)].sort(
    (a, b) => groupRank(a, order) - groupRank(b, order),
  );
}

// ── Component ──────────────────────────────────────────────────────────

export function TodoList({
  todos,
  view,
  onToggle,
  onDelete,
  onAdd,
  onUpdate,
  onMove,
  onMoveGroup,
  onRenameGroup,
  groupOrder,
  calendarEvents,
  onRefreshCalendar,
}: TodoListProps) {
  const [newTodo, setNewTodo] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newTodo.trim();
    if (!text) return;
    const category: "today" | "backlog" = view === "backlog" ? "backlog" : "today";
    onAdd(text, category);
    setNewTodo("");
  };

  // ── Recently-deleted view ──────────────────────────────────────────

  const recentlyDeleted = useMemo(() => {
    if (view !== "recentlyDeleted") return [];
    const now = Date.now();
    const MS_PER_DAY = 86_400_000;
    return todos.filter(
      (t) => t.deletedAt && (now - new Date(t.deletedAt).getTime()) / MS_PER_DAY <= 30,
    );
  }, [todos, view]);

  if (view === "recentlyDeleted") {
    return (
      <div className="flex-1 h-full overflow-auto">
        <div className="max-w-2xl mx-auto p-4">
          <h2 className="text-3xl font-semibold text-zinc-900 mb-4">
            Recently deleted
          </h2>
          <div className="space-y-0">
            {recentlyDeleted.length > 0 ? (
              recentlyDeleted.map((todo) => (
                <div
                  key={todo.id}
                  className="border border-zinc-200 rounded-lg p-0.5 bg-zinc-50 flex flex-col gap-0.5 opacity-60"
                >
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-zinc-700 line-through text-sm">
                      {todo.summary}
                    </span>
                    <span className="text-sm text-zinc-400 ml-1">
                      Deleted: {todo.deletedAt?.slice(0, 10)}
                    </span>
                  </div>
                  {todo.description && (
                    <div className="text-zinc-400 text-xs">{todo.description}</div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-zinc-400">
                No recently deleted items.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Today view ─────────────────────────────────────────────────────

  // Memoised filtered/sorted buckets for the "today" view
  const todayBuckets = useMemo(() => {
    if (view !== "today") return null;

    const today = todayStr();
    const isDueOrOverdue = (d: string) => d <= today;

    const due = todos.filter(
      (t) => !t.completed && t.dueDate && isDueOrOverdue(t.dueDate) && !t.deletedAt,
    );
    const starredDue = due
      .filter((t) => t.starred)
      .sort((a, b) => byPriorityGroupOrder(a, b, groupOrder));

    const scheduledDue = due
      .filter((t) => !t.starred)
      .sort((a, b) => byPriorityGroupOrder(a, b, groupOrder));

    const nextUp = todos
      .filter((t) => !t.completed && !t.dueDate && !t.deletedAt)
      .sort((a, b) => {
        // Starred first, then priority → group rank → order
        if (a.starred !== b.starred) return b.starred ? 1 : -1;
        return byPriorityGroupOrder(a, b, groupOrder);
      })
      .slice(0, 3);

    const completedToday = todos
      .filter((t) => t.completed && t.completedAt === today && !t.deletedAt)
      .sort((a, b) => {
        const g = displayGroup(a.group).localeCompare(displayGroup(b.group));
        return g !== 0 ? g : a.order - b.order;
      });

    const isEmpty =
      starredDue.length === 0 &&
      scheduledDue.length === 0 &&
      nextUp.length === 0 &&
      completedToday.length === 0;

    return { starredDue, scheduledDue, nextUp, completedToday, isEmpty };
  }, [todos, view, groupOrder]);

  if (view === "today" && todayBuckets) {
    const { starredDue, scheduledDue, nextUp, completedToday, isEmpty } = todayBuckets;

    return (
      <div className="flex-1 h-full overflow-auto">
        <div className="max-w-2xl mx-auto p-4">
          <h2 className="text-2xl font-semibold text-zinc-900 mb-4 capitalize">
            {view}
          </h2>

          <CalendarEvents
            events={calendarEvents ?? null}
            onAddCalendarAccess={onRefreshCalendar}
          />

          <AddTodoForm value={newTodo} onChange={setNewTodo} onSubmit={handleSubmit} />

          <div className="space-y-1">
            {starredDue.length > 0 && (
              <TodoSection
                heading="⭐ Starred & Due"
                headingClass="text-yellow-600 bg-yellow-50"
              >
                {starredDue.map((todo) => (
                  <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} showGroupInline />
                ))}
              </TodoSection>
            )}

            {scheduledDue.length > 0 && (
              <TodoSection heading="📅 Scheduled" headingClass="text-zinc-700 bg-zinc-100">
                {scheduledDue.map((todo) => (
                  <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} showGroupInline />
                ))}
              </TodoSection>
            )}

            {nextUp.length > 0 && (
              <TodoSection heading="📋 Next Up (Top 3)" headingClass="text-zinc-700 bg-zinc-100">
                {nextUp.map((todo) => (
                  <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} showGroupInline />
                ))}
              </TodoSection>
            )}

            {completedToday.length > 0 && (
              <TodoSection heading="✓ Completed Today" headingClass="text-green-700 bg-green-50">
                {completedToday.map((todo) => (
                  <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onDelete={onDelete} onUpdate={onUpdate} />
                ))}
              </TodoSection>
            )}

            {isEmpty && (
              <p className="text-center py-6 text-zinc-400">
                No tasks yet. Add one to get started!
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Backlog view ───────────────────────────────────────────────────

  const { activeGroups, activeKeys, completedGroups, completedKeys } = useMemo(() => {
    const active = todos.filter((t) => !t.completed && !t.deletedAt);
    const completed = todos.filter((t) => t.completed && !t.deletedAt);

    const ag = groupByName(active);
    const cg = groupByName(completed);

    return {
      activeGroups: ag,
      activeKeys: sortGroupKeys(ag, groupOrder),
      completedGroups: cg,
      completedKeys: sortGroupKeys(cg, groupOrder),
    };
  }, [todos, groupOrder]);

  const hasAnyGroups = activeKeys.length > 0 || completedKeys.length > 0;

  return (
    <div className="flex-1 h-full overflow-auto">
      <div className="max-w-2xl mx-auto p-4">
        <h2 className="text-2xl font-semibold text-zinc-900 mb-4 capitalize">
          {view}
        </h2>

        <AddTodoForm value={newTodo} onChange={setNewTodo} onSubmit={handleSubmit} />

        <div className="space-y-0">
          {/* Active groups */}
          {activeKeys.length > 0 && (
            <div className="space-y-0">
              {activeKeys.map((groupName, idx) => (
                <div key={groupName} className="space-y-0">
                  {onMoveGroup ? (
                    <DraggableGroupHeader
                      groupName={groupName}
                      groupIndex={idx}
                      onMoveGroup={onMoveGroup}
                      onRenameGroup={onRenameGroup}
                      color="bg-zinc-100"
                    />
                  ) : (
                    <h3 className="text-xs font-semibold text-zinc-700 px-2 py-1 bg-zinc-100 rounded-md">
                      {groupName}
                    </h3>
                  )}

                  <div className="space-y-0">
                    {activeGroups[groupName].map((todo, i) => (
                      <DraggableTodoItem
                        key={todo.id}
                        todo={todo}
                        index={i}
                        groupName={groupName}
                        onToggle={onToggle}
                        onDelete={onDelete}
                        onUpdate={onUpdate}
                        onMove={onMove}
                      />
                    ))}
                    <TodoDropZone
                      groupName={groupName}
                      lastTodoId={activeGroups[groupName].at(-1)?.id ?? null}
                      onMove={onMove}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Completed groups */}
          {completedKeys.length > 0 && (
            <div className="space-y-0">
              <h3 className="text-xs font-medium text-zinc-500 mb-1 px-2">
                Completed
              </h3>
              {completedKeys.map((groupName, idx) => (
                <div key={`completed-${groupName}`} className="space-y-0">
                  {onMoveGroup ? (
                    <DraggableGroupHeader
                      groupName={groupName}
                      groupIndex={idx}
                      onRenameGroup={onRenameGroup}
                      onMoveGroup={onMoveGroup}
                      color="bg-zinc-50"
                    />
                  ) : (
                    <h4 className="text-xs font-medium text-zinc-400 px-2">
                      {groupName}
                    </h4>
                  )}

                  <div className="space-y-0">
                    {completedGroups[groupName].map((todo, i) => (
                      <DraggableTodoItem
                        key={todo.id}
                        todo={todo}
                        index={i}
                        groupName={groupName}
                        onToggle={onToggle}
                        onDelete={onDelete}
                        onUpdate={onUpdate}
                        onMove={onMove}
                      />
                    ))}
                    <TodoDropZone
                      groupName={groupName}
                      lastTodoId={completedGroups[groupName].at(-1)?.id ?? null}
                      onMove={onMove}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Trailing drop zone for group reordering */}
          {onMoveGroup && hasAnyGroups && (
            <div className="mt-4">
              <GroupDropZone
                lastGroupName={
                  (completedKeys.at(-1) ?? activeKeys.at(-1))!
                }
                onMoveGroup={onMoveGroup}
              />
            </div>
          )}

          {!hasAnyGroups && (
            <p className="text-center py-6 text-zinc-400">
              No tasks yet. Add one to get started!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Reusable sub-components ──────────────────────────────────────────

function AddTodoForm({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="mb-4">
      <div className="flex gap-1">
        <Input
          type="text"
          placeholder="Add a new task..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" size="icon">
          <Plus className="h-5 w-5" />
          <span className="sr-only">Add task</span>
        </Button>
      </div>
    </form>
  );
}

function TodoSection({
  heading,
  headingClass,
  children,
}: {
  heading: string;
  headingClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0">
      <h3
        className={`text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1.5 ${headingClass}`}
      >
        {heading}
      </h3>
      <div className="space-y-0">{children}</div>
    </div>
  );
}
