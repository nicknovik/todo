import { useState } from "react";
import { Plus } from "lucide-react";
import { Todo } from "./TodoItem";
import { DraggableTodoItem } from "./DraggableTodoItem";
import { DraggableGroupHeader } from "./DraggableGroupHeader";
import { TodoDropZone } from "./TodoDropZone";
import { GroupDropZone } from "./GroupDropZone";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { TodoItem } from "./TodoItem";
import { CalendarEvents } from "./CalendarEvents";
import { CalendarEvent } from "../googleCalendarService";

interface TodoListProps {
  todos: Todo[];
  view: "today" | "backlog" | "recentlyDeleted";
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

export function TodoList({ todos, view, onToggle, onDelete, onAdd, onUpdate, onMove, onMoveGroup, onRenameGroup, groupOrder, calendarEvents, onRefreshCalendar }: TodoListProps) {
  const [newTodo, setNewTodo] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTodo.trim()) {
      // Only allow adding to "today" or "backlog", not "recentlyDeleted"
      const category: "today" | "backlog" = view === "backlog" ? "backlog" : "today";
      onAdd(newTodo.trim(), category);
      setNewTodo("");
    }
  };

  // Filter logic for each view
  let filteredTodos: Todo[] = [];
  if (view === "recentlyDeleted") {
    // Show only todos deleted within the last 30 days
    const now = new Date();
    filteredTodos = todos.filter(todo => {
      if (!todo.deletedAt) return false;
      const deletedDate = new Date(todo.deletedAt);
      const diffDays = (now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays <= 30;
    });
  } else if (view === "backlog") {
    filteredTodos = todos.filter((todo) => !todo.completed && !todo.deletedAt);
  } else {
    filteredTodos = todos.filter((todo) => todo.category === view && !todo.deletedAt);
  }

  // Helper to get group rank from groupOrder
  const getGroupRank = (group: string): number => {
    if (!groupOrder || groupOrder.length === 0) {
      return Infinity;
    }
    const index = groupOrder.indexOf(group);
    return index === -1 ? Infinity : index;
  };

  // Helper to get priority value for sorting
  const getPriorityValue = (priority: Todo["priority"]) => {
    const priorities = { "!!!": 3, "!!": 2, "!": 1, "": 0 };
    return priorities[priority] || 0;
  };

  // Helper to check if a date is today
  const isToday = (dateString?: string) => {
    if (!dateString) return false;
    const today = new Date().toISOString().split("T")[0];
    return dateString === today;
  };

  // Helper to check if a date is today or before today (overdue)
  const isTodayOrBefore = (dateString?: string) => {
    if (!dateString) return false;
    const today = new Date().toISOString().split("T")[0];
    return dateString <= today;
  };

  // For "Today" view, use special sorting
  if (view === "recentlyDeleted") {
    // Show deleted items only
    return (
      <div className="flex-1 h-full overflow-auto">
        <div className="max-w-2xl mx-auto p-4">
          <h2 className="text-3xl font-semibold text-zinc-900 mb-4 capitalize">
            Recently deleted
          </h2>
          <div className="space-y-0">
            {filteredTodos.length > 0 ? (
              filteredTodos.map((todo) => (
                <div key={todo.id} className="border border-zinc-200 rounded-lg p-0.5 bg-zinc-50 flex flex-col gap-0.5 opacity-60">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-zinc-700 line-through text-sm">{todo.summary}</span>
                    <span className="text-sm text-zinc-400 ml-1">Deleted: {todo.deletedAt?.slice(0, 10)}</span>
                  </div>
                  <div className="text-zinc-400 text-xs">{todo.description}</div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-zinc-400">No recently deleted items.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === "today") {
    // Only consider todos due today or before (overdue) or without due date
    const dueToday = todos.filter(
      (todo) => !todo.completed && todo.dueDate && isTodayOrBefore(todo.dueDate) && !todo.deletedAt
    );
    // 1. Starred todo with due date = today (not completed)
    const starredWithDueToday = dueToday
      .filter((todo) => todo.starred)
      .sort((a, b) => {
        const priorityDiff = getPriorityValue(b.priority) - getPriorityValue(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        const groupA = a.group || "Ungrouped";
        const groupB = b.group || "Ungrouped";
        const groupRankDiff = getGroupRank(groupA) - getGroupRank(groupB);
        if (groupRankDiff !== 0) return groupRankDiff;
        return a.order - b.order;
      });

    // 2. Other todo with due date = today (not completed)
    const otherWithDueToday = dueToday
      .filter((todo) => !todo.starred)
      .sort((a, b) => {
        const priorityDiff = getPriorityValue(b.priority) - getPriorityValue(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        const groupA = a.group || "Ungrouped";
        const groupB = b.group || "Ungrouped";
        const groupRankDiff = getGroupRank(groupA) - getGroupRank(groupB);
        if (groupRankDiff !== 0) return groupRankDiff;
        return a.order - b.order;
      });

    // 3. Top 3 todo without due date, not completed
    const withoutDueDate = todos
      .filter((todo) => !todo.completed && !todo.dueDate && !todo.deletedAt)
      .sort((a, b) => {
        // 1. Sort by starred (true before false)
        if (a.starred !== b.starred) {
          return (b.starred ? 1 : 0) - (a.starred ? 1 : 0);
        }
        // 2. Sort by priority
        const priorityDiff = getPriorityValue(b.priority) - getPriorityValue(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        // 3. Sort by group rank
        const groupA = a.group || "Ungrouped";
        const groupB = b.group || "Ungrouped";
        const groupRankDiff = getGroupRank(groupA) - getGroupRank(groupB);
        if (groupRankDiff !== 0) return groupRankDiff;
        // 4. Sort by item order
        return a.order - b.order;
      })
      .slice(0, 3);

    // 4. Items completed today
    const completedToday = todos
      .filter((todo) => todo.completed && isToday(todo.completedAt) && !todo.deletedAt)
      .sort((a, b) => {
        const groupA = a.group || "Ungrouped";
        const groupB = b.group || "Ungrouped";
        if (groupA !== groupB) return groupA.localeCompare(groupB);
        return a.order - b.order;
      });

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

          <form onSubmit={handleSubmit} className="mb-4">
            <div className="flex gap-1">
              <Input
                type="text"
                placeholder="Add a new task..."
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" size="icon">
                <Plus className="h-5 w-5" />
                <span className="sr-only">Add task</span>
              </Button>
            </div>
          </form>

          <div className="space-y-1">
              {starredWithDueToday.length > 0 && (
              <div className="space-y-0">
                <h3 className="text-xs font-semibold text-yellow-600 px-2 py-1 bg-yellow-50 rounded-md flex items-center gap-1.5">
                  ⭐ Starred & Due
                </h3>
                <div className="space-y-0">
                    {starredWithDueToday.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onUpdate={onUpdate}
                      showGroupInline={true}
                    />
                  ))}
                </div>
              </div>
            )}

              {otherWithDueToday.length > 0 && (
              <div className="space-y-0">
                <h3 className="text-xs font-semibold text-zinc-700 px-2 py-1 bg-zinc-100 rounded-md">
                  📅 Scheduled
                </h3>
                <div className="space-y-0">
                    {otherWithDueToday.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onUpdate={onUpdate}
                      showGroupInline={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {withoutDueDate.length > 0 && (
              <div className="space-y-0">
                <h3 className="text-xs font-semibold text-zinc-700 px-2 py-1 bg-zinc-100 rounded-md">
                  📋 Next Up (Top 3)
                </h3>
                <div className="space-y-0">
                  {withoutDueDate.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onUpdate={onUpdate}
                      showGroupInline={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {completedToday.length > 0 && (
              <div className="space-y-0">
                <h3 className="text-xs font-semibold text-green-700 px-2 py-1 bg-green-50 rounded-md">
                  ✓ Completed Today
                </h3>
                <div className="space-y-0">
                  {completedToday.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={onToggle}
                      onDelete={onDelete}
                      onUpdate={onUpdate}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredTodos.length === 0 && (
              <div className="text-center py-6">
                <p className="text-zinc-400">No tasks yet. Add one to get started!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // For "Backlog" view, use original grouping logic
  const activeTodos = filteredTodos.filter((todo) => !todo.completed);
  const completedTodos = filteredTodos.filter((todo) => todo.completed);

  // Group active todos by group name
  const groupedActiveTodos = activeTodos.reduce((acc, todo) => {
    const groupName = todo.group || "Ungrouped";
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(todo);
    return acc;
  }, {} as Record<string, Todo[]>);

  // Sort todos within each group by order
  Object.keys(groupedActiveTodos).forEach((groupName) => {
    groupedActiveTodos[groupName].sort((a, b) => a.order - b.order);
  });

  // Group completed todos by group name
  const groupedCompletedTodos = completedTodos.reduce((acc, todo) => {
    const groupName = todo.group || "Ungrouped";
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(todo);
    return acc;
  }, {} as Record<string, Todo[]>);

  // Sort completed todos within each group by order
  Object.keys(groupedCompletedTodos).forEach((groupName) => {
    groupedCompletedTodos[groupName].sort((a, b) => a.order - b.order);
  });

  // Sort groups by groupOrder if provided
  const sortGroupsByOrder = (groups: Record<string, Todo[]>) => {
    if (!groupOrder || groupOrder.length === 0) {
      return Object.keys(groups);
    }
    const sortedKeys = [...Object.keys(groups)].sort((a, b) => {
      const aIndex = groupOrder.indexOf(a);
      const bIndex = groupOrder.indexOf(b);
      const aPosition = aIndex === -1 ? Infinity : aIndex;
      const bPosition = bIndex === -1 ? Infinity : bIndex;
      return aPosition - bPosition;
    });
    return sortedKeys;
  };

  const sortedActiveGroupNames = sortGroupsByOrder(groupedActiveTodos);
  const sortedCompletedGroupNames = sortGroupsByOrder(groupedCompletedTodos);

  return (
    <div className="flex-1 h-full overflow-auto">
      <div className="max-w-2xl mx-auto p-4">
        <h2 className="text-2xl font-semibold text-zinc-900 mb-4 capitalize">
          {view}
        </h2>

        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex gap-1">
            <Input
              type="text"
              placeholder="Add a new task..."
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="icon">
              <Plus className="h-5 w-5" />
              <span className="sr-only">Add task</span>
            </Button>
          </div>
        </form>

        <div className="space-y-0">
          {sortedActiveGroupNames.length > 0 && (
            <div className="space-y-0">
              {sortedActiveGroupNames.map((groupName, groupIndex) => (
                <div key={groupName} className="space-y-0">
                  {onMoveGroup && (
                    <DraggableGroupHeader
                      groupName={groupName}
                      groupIndex={groupIndex}
                      onMoveGroup={onMoveGroup}
                      onRenameGroup={onRenameGroup}
                      color="bg-zinc-100"
                    />
                  )}
                  {!onMoveGroup && (
                    <h3 className="text-xs font-semibold text-zinc-700 px-2 py-1 bg-zinc-100 rounded-md">
                      {groupName}
                    </h3>
                  )}
                  <div className="space-y-0">
                    {groupedActiveTodos[groupName].map((todo, index) => (
                      <DraggableTodoItem
                        key={todo.id}
                        todo={todo}
                        index={index}
                        groupName={groupName}
                        onToggle={onToggle}
                        onDelete={onDelete}
                        onUpdate={onUpdate}
                        onMove={onMove}
                      />
                    ))}
                    {groupedActiveTodos[groupName].length > 0 && (
                      <TodoDropZone
                        groupName={groupName}
                        lastTodoId={groupedActiveTodos[groupName][groupedActiveTodos[groupName].length - 1].id}
                        onMove={onMove}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {sortedCompletedGroupNames.length > 0 && (
            <div className="space-y-0">
              <h3 className="text-xs font-medium text-zinc-500 mb-1 px-2">
                Completed
              </h3>
              {sortedCompletedGroupNames.map((groupName, groupIndex) => (
                <div key={`completed-${groupName}`} className="space-y-0">
                  {onMoveGroup && (
                    <DraggableGroupHeader
                      groupName={groupName}
                      groupIndex={groupIndex}
                      onRenameGroup={onRenameGroup}
                      onMoveGroup={onMoveGroup}
                      color="bg-zinc-50"
                    />
                  )}
                  {!onMoveGroup && (
                    <h4 className="text-xs font-medium text-zinc-400 px-2">
                      {groupName}
                    </h4>
                  )}
                  <div className="space-y-0">
                    {groupedCompletedTodos[groupName].map((todo, index) => (
                      <DraggableTodoItem
                        key={todo.id}
                        todo={todo}
                        index={index}
                        groupName={groupName}
                        onToggle={onToggle}
                        onDelete={onDelete}
                        onUpdate={onUpdate}
                        onMove={onMove}
                      />
                    ))}
                    {groupedCompletedTodos[groupName].length > 0 && (
                      <TodoDropZone
                        groupName={groupName}
                        lastTodoId={groupedCompletedTodos[groupName][groupedCompletedTodos[groupName].length - 1].id}
                        onMove={onMove}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {onMoveGroup && (sortedActiveGroupNames.length > 0 || sortedCompletedGroupNames.length > 0) && (
            <div className="mt-4">
              <GroupDropZone
                lastGroupName={
                  sortedCompletedGroupNames.length > 0
                    ? sortedCompletedGroupNames[sortedCompletedGroupNames.length - 1]
                    : sortedActiveGroupNames[sortedActiveGroupNames.length - 1]
                }
                onMoveGroup={onMoveGroup}
              />
            </div>
          )}

          {filteredTodos.length === 0 && (
            <div className="text-center py-6">
              <p className="text-zinc-400">No tasks yet. Add one to get started!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
