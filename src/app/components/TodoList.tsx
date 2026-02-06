import { useState } from "react";
import { Plus } from "lucide-react";
import { Todo } from "./TodoItem";
import { DraggableTodoItem } from "./DraggableTodoItem";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { TodoItem } from "./TodoItem";

interface TodoListProps {
  todos: Todo[];
  view: "today" | "backlog" | "recentlyDeleted";
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (text: string, category: "today" | "backlog") => void;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
  onMove: (dragId: string, hoverId: string, dragGroup: string, hoverGroup: string) => void;
}

export function TodoList({ todos, view, onToggle, onDelete, onAdd, onUpdate, onMove }: TodoListProps) {
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

  // For "Today" view, use special sorting
  if (view === "recentlyDeleted") {
    // Show deleted items only
    return (
      <div className="flex-1 h-full overflow-auto">
        <div className="max-w-2xl mx-auto p-4">
          <h2 className="text-3xl font-semibold text-zinc-900 mb-4 capitalize">
            Recently deleted
          </h2>
          <div className="space-y-4">
            {filteredTodos.length > 0 ? (
              filteredTodos.map((todo) => (
                <div key={todo.id} className="border border-zinc-200 rounded-lg p-2 bg-zinc-50 flex flex-col gap-1 opacity-60">
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
    // Only consider todos due today or without due date
    const dueToday = todos.filter(
      (todo) => !todo.completed && todo.dueDate && isToday(todo.dueDate) && !todo.deletedAt
    );
    // 1. Starred todo with due date = today (not completed)
    const starredWithDueToday = dueToday
      .filter((todo) => todo.starred)
      .sort((a, b) => {
        const priorityDiff = getPriorityValue(b.priority) - getPriorityValue(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        const groupA = a.group || "Ungrouped";
        const groupB = b.group || "Ungrouped";
        if (groupA !== groupB) return groupA.localeCompare(groupB);
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
        if (groupA !== groupB) return groupA.localeCompare(groupB);
        return a.order - b.order;
      });

    // 3. Top 3 todo without due date, not completed
    const withoutDueDate = todos
      .filter((todo) => !todo.completed && !todo.dueDate && !todo.deletedAt)
      .sort((a, b) => {
        const priorityDiff = getPriorityValue(b.priority) - getPriorityValue(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        const groupA = a.group || "Ungrouped";
        const groupB = b.group || "Ungrouped";
        if (groupA !== groupB) return groupA.localeCompare(groupB);
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

          <div className="space-y-4">
              {starredWithDueToday.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-yellow-600 px-2 py-1 bg-yellow-50 rounded-md flex items-center gap-1.5">
                  ⭐ Starred & Due
                </h3>
                <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-zinc-700 px-2 py-1 bg-zinc-100 rounded-md">
                  📅 Scheduled
                </h3>
                <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-zinc-700 px-2 py-1 bg-zinc-100 rounded-md">
                  📋 Next Up (Top 3)
                </h3>
                <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <h3 className="text-xs font-semibold text-green-700 px-2 py-1 bg-green-50 rounded-md">
                  ✓ Completed Today
                </h3>
                <div className="space-y-1.5">
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

        <div className="space-y-4">
          {Object.keys(groupedActiveTodos).length > 0 && (
            <div className="space-y-3.5">
              {Object.entries(groupedActiveTodos).map(([groupName, groupTodos]) => (
                <div key={groupName} className="space-y-1.5">
                  <h3 className="text-xs font-semibold text-zinc-700 px-2 py-1 bg-zinc-100 rounded-md">
                    {groupName}
                  </h3>
                  <div className="space-y-1.5">
                    {groupTodos.map((todo, index) => (
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
                  </div>
                </div>
              ))}
            </div>
          )}

          {Object.keys(groupedCompletedTodos).length > 0 && (
            <div className="space-y-3.5">
              <h3 className="text-xs font-medium text-zinc-500 mb-1 px-2">
                Completed
              </h3>
              {Object.entries(groupedCompletedTodos).map(([groupName, groupTodos]) => (
                <div key={`completed-${groupName}`} className="space-y-1.5">
                  <h4 className="text-xs font-medium text-zinc-400 px-2">
                    {groupName}
                  </h4>
                  <div className="space-y-1.5">
                    {groupTodos.map((todo, index) => (
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
                  </div>
                </div>
              ))}
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
