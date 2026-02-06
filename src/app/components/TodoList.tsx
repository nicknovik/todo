import { useState } from "react";
import { Plus } from "lucide-react";
import { Todo } from "./TodoItem";
import { DraggableTodoItem } from "./DraggableTodoItem";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { TodoItem } from "./TodoItem";

interface TodoListProps {
  todos: Todo[];
  view: "today" | "backlog";
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
      onAdd(newTodo.trim(), view);
      setNewTodo("");
    }
  };

  const filteredTodos = todos.filter((todo) => todo.category === view);

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
  if (view === "today") {
    // 1. Starred with due date (not completed)
    const starredWithDueDate = filteredTodos
      .filter((todo) => !todo.completed && todo.starred && todo.dueDate)
      .sort((a, b) => {
        // Sort by priority first
        const priorityDiff = getPriorityValue(b.priority) - getPriorityValue(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        // Then by group
        const groupA = a.group || "Ungrouped";
        const groupB = b.group || "Ungrouped";
        if (groupA !== groupB) return groupA.localeCompare(groupB);
        // Then by order
        return a.order - b.order;
      });

    // 2. Unstarred uncompleted items with due date sorted by priority, group, order
    const unstarredWithDueDate = filteredTodos
      .filter((todo) => !todo.completed && !todo.starred && todo.dueDate)
      .sort((a, b) => {
        const priorityDiff = getPriorityValue(b.priority) - getPriorityValue(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        const groupA = a.group || "Ungrouped";
        const groupB = b.group || "Ungrouped";
        if (groupA !== groupB) return groupA.localeCompare(groupB);
        return a.order - b.order;
      });

    // 3. Top 3 uncompleted todos without due date sorted by priority, group, order
    const withoutDueDate = filteredTodos
      .filter((todo) => !todo.completed && !todo.dueDate)
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
    const completedToday = filteredTodos
      .filter((todo) => todo.completed && isToday(todo.completedAt))
      .sort((a, b) => {
        const groupA = a.group || "Ungrouped";
        const groupB = b.group || "Ungrouped";
        if (groupA !== groupB) return groupA.localeCompare(groupB);
        return a.order - b.order;
      });

    return (
      <div className="flex-1 h-full overflow-auto">
        <div className="max-w-2xl mx-auto p-8">
          <h2 className="text-3xl font-semibold text-zinc-900 mb-8 capitalize">
            {view}
          </h2>

          <form onSubmit={handleSubmit} className="mb-8">
            <div className="flex gap-2">
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

          <div className="space-y-8">
            {starredWithDueDate.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-yellow-600 px-3 py-2 bg-yellow-50 rounded-md flex items-center gap-2">
                  ⭐ Starred & Due
                </h3>
                <div className="space-y-2">
                  {starredWithDueDate.map((todo) => (
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

            {unstarredWithDueDate.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-zinc-700 px-3 py-2 bg-zinc-100 rounded-md">
                  📅 Scheduled
                </h3>
                <div className="space-y-2">
                  {unstarredWithDueDate.map((todo) => (
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

            {withoutDueDate.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-zinc-700 px-3 py-2 bg-zinc-100 rounded-md">
                  📋 Next Up (Top 3)
                </h3>
                <div className="space-y-2">
                  {withoutDueDate.map((todo) => (
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

            {completedToday.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-green-700 px-3 py-2 bg-green-50 rounded-md">
                  ✓ Completed Today
                </h3>
                <div className="space-y-2">
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
              <div className="text-center py-12">
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
      <div className="max-w-2xl mx-auto p-8">
        <h2 className="text-3xl font-semibold text-zinc-900 mb-8 capitalize">
          {view}
        </h2>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex gap-2">
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

        <div className="space-y-8">
          {Object.keys(groupedActiveTodos).length > 0 && (
            <div className="space-y-6">
              {Object.entries(groupedActiveTodos).map(([groupName, groupTodos]) => (
                <div key={groupName} className="space-y-2">
                  <h3 className="text-sm font-semibold text-zinc-700 px-3 py-2 bg-zinc-100 rounded-md">
                    {groupName}
                  </h3>
                  <div className="space-y-2">
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
            <div className="space-y-6">
              <h3 className="text-sm font-medium text-zinc-500 mb-2 px-3">
                Completed
              </h3>
              {Object.entries(groupedCompletedTodos).map(([groupName, groupTodos]) => (
                <div key={`completed-${groupName}`} className="space-y-2">
                  <h4 className="text-xs font-medium text-zinc-400 px-3">
                    {groupName}
                  </h4>
                  <div className="space-y-2">
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
            <div className="text-center py-12">
              <p className="text-zinc-400">No tasks yet. Add one to get started!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
