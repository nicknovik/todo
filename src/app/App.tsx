import { useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Sidebar } from "./components/Sidebar";
import { TodoList } from "./components/TodoList";
import { Todo } from "./components/TodoItem";

export default function App() {
  const [currentView, setCurrentView] = useState<"today" | "backlog">("today");
  const [todos, setTodos] = useState<Todo[]>([
    {
      id: "1",
      summary: "Review project proposal",
      description: "",
      completed: false,
      category: "today",
      dueDate: "2026-02-07",
      starred: true,
      repeatDays: 0,
      group: "Work",
      priority: "!!!",
      order: 0,
    },
    {
      id: "2",
      summary: "Update documentation",
      description: "",
      completed: false,
      category: "today",
      dueDate: "2026-02-08",
      starred: false,
      repeatDays: 0,
      group: "Work",
      priority: "!",
      order: 1,
    },
    {
      id: "3",
      summary: "Buy groceries",
      description: "",
      completed: false,
      category: "today",
      dueDate: "",
      starred: false,
      repeatDays: 0,
      group: "Personal",
      priority: "!!",
      order: 0,
    },
    {
      id: "4",
      summary: "Research new features",
      description: "",
      completed: false,
      category: "backlog",
      dueDate: "",
      starred: false,
      repeatDays: 0,
      group: "Work",
      priority: "",
      order: 0,
    },
    {
      id: "5",
      summary: "Call dentist",
      description: "",
      completed: false,
      category: "today",
      dueDate: "",
      starred: false,
      repeatDays: 0,
      group: "Personal",
      priority: "!",
      order: 1,
    },
    {
      id: "6",
      summary: "Finish report",
      description: "",
      completed: true,
      category: "today",
      dueDate: "2026-02-06",
      starred: false,
      repeatDays: 0,
      group: "Work",
      priority: "!!",
      order: 2,
      completedAt: "2026-02-06",
    },
  ]);

  const handleToggle = (id: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              completed: !todo.completed,
              completedAt: !todo.completed ? new Date().toISOString().split("T")[0] : undefined,
            }
          : todo
      )
    );
  };

  const handleDelete = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const handleAdd = (text: string, category: "today" | "backlog") => {
    // Find max order in the "Ungrouped" group for this category
    const ungroupedTodos = todos.filter(
      (t) => t.category === category && (!t.group || t.group === "Ungrouped")
    );
    const maxOrder = ungroupedTodos.length > 0
      ? Math.max(...ungroupedTodos.map((t) => t.order))
      : -1;

    const newTodo: Todo = {
      id: Date.now().toString(),
      summary: text,
      description: "",
      completed: false,
      category,
      dueDate: "",
      starred: false,
      repeatDays: 0,
      group: "",
      priority: "",
      order: maxOrder + 1,
    };
    setTodos([...todos, newTodo]);
  };

  const handleUpdate = (id: string, updates: Partial<Todo>) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, ...updates } : todo
      )
    );
  };

  const handleMove = (dragId: string, hoverId: string, dragGroup: string, hoverGroup: string) => {
    const dragTodo = todos.find((t) => t.id === dragId);
    const hoverTodo = todos.find((t) => t.id === hoverId);

    if (!dragTodo || !hoverTodo) return;

    // If moving within the same group
    if (dragGroup === hoverGroup && dragTodo.category === hoverTodo.category) {
      const groupTodos = todos.filter(
        (t) => t.category === dragTodo.category && (t.group || "Ungrouped") === dragGroup
      ).sort((a, b) => a.order - b.order);

      const dragIndex = groupTodos.findIndex((t) => t.id === dragId);
      const hoverIndex = groupTodos.findIndex((t) => t.id === hoverId);

      if (dragIndex === -1 || hoverIndex === -1) return;

      // Reorder within the same group
      const newGroupTodos = [...groupTodos];
      const [removed] = newGroupTodos.splice(dragIndex, 1);
      newGroupTodos.splice(hoverIndex, 0, removed);

      // Update orders
      const updatedTodos = todos.map((todo) => {
        const newIndex = newGroupTodos.findIndex((t) => t.id === todo.id);
        if (newIndex !== -1) {
          return { ...todo, order: newIndex };
        }
        return todo;
      });

      setTodos(updatedTodos);
    } else {
      // Moving to a different group
      const newGroup = hoverGroup === "Ungrouped" ? "" : hoverGroup;
      const targetGroupTodos = todos.filter(
        (t) => t.category === hoverTodo.category && (t.group || "Ungrouped") === hoverGroup
      ).sort((a, b) => a.order - b.order);

      const hoverIndex = targetGroupTodos.findIndex((t) => t.id === hoverId);

      // Update the dragged todo's group and insert it at the hover position
      const updatedTodos = todos.map((todo) => {
        if (todo.id === dragId) {
          return {
            ...todo,
            group: newGroup,
            category: hoverTodo.category,
            order: hoverIndex,
          };
        }
        // Update orders for todos in the target group that come after the insertion point
        if (
          (todo.group || "Ungrouped") === hoverGroup &&
          todo.category === hoverTodo.category &&
          todo.order >= hoverIndex &&
          todo.id !== hoverId
        ) {
          return { ...todo, order: todo.order + 1 };
        }
        return todo;
      });

      // Reorder the source group
      const sourceGroup = dragGroup === "Ungrouped" ? "" : dragGroup;
      const sourceGroupTodos = updatedTodos.filter(
        (t) => t.category === dragTodo.category && (t.group || "Ungrouped") === dragGroup && t.id !== dragId
      ).sort((a, b) => a.order - b.order);

      const finalTodos = updatedTodos.map((todo) => {
        const newIndex = sourceGroupTodos.findIndex((t) => t.id === todo.id);
        if (newIndex !== -1 && (todo.group || "Ungrouped") === dragGroup && todo.category === dragTodo.category) {
          return { ...todo, order: newIndex };
        }
        return todo;
      });

      setTodos(finalTodos);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="size-full flex bg-zinc-50">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} />
        <TodoList
          todos={todos}
          view={currentView}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onAdd={handleAdd}
          onUpdate={handleUpdate}
          onMove={handleMove}
        />
      </div>
    </DndProvider>
  );
}