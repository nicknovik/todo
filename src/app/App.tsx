import { useState, useEffect } from "react";
import { AuthForm } from "./components/AuthForm";
import { getCurrentUser, signOut } from "./auth";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Sidebar } from "./components/Sidebar";
import { TodoList } from "./components/TodoList";
import { Todo } from "./components/TodoItem";
import { fetchTodos, addTodo, updateTodo, deleteTodo, fetchGroupOrder, updateGroupOrder } from "./supabaseTodos";
import { supabase } from "../supabaseClient";

export default function App() {
  const [currentView, setCurrentView] = useState<"today" | "backlog" | "recentlyDeleted">("today");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [groupOrder, setGroupOrder] = useState<string[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Load todos from Supabase when user logs in
  useEffect(() => {
    async function cleanupAndFetch() {
      if (user?.id) {
        setLoadingTodos(true);
        // Permanently remove deleted items older than 365 days
        const thirtyDaysAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
        await supabase
          .from("todos")
          .delete()
          .lt("deleted_at", thirtyDaysAgo)
          .eq("user_id", user.id);
        // Fetch todos
        const todos = await fetchTodos(user.id);
        setTodos(todos);
        // Fetch group order
        try {
          const orders = await fetchGroupOrder(user.id);
          const backlogOrder = orders.backlog || [];
          setGroupOrder(backlogOrder);
        } catch (err) {
          // Table may not exist yet, that's ok
          setGroupOrder([]);
        }
        setLoadingTodos(false);
      } else {
        setTodos([]);
        setGroupOrder([]);
      }
    }
    cleanupAndFetch();
  }, [user]);

  useEffect(() => {
    getCurrentUser().then(({ data }) => {
      setUser(data?.user || null);
      setLoadingUser(false);
    });
    // Listen for auth changes
    const { data: listener } = (window as any).supabase?.auth.onAuthStateChange?.((event: string, session: any) => {
      setUser(session?.user || null);
    }) || { data: null };
    return () => {
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleToggle = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const updates = {
      completed: !todo.completed,
      completedAt: !todo.completed ? new Date().toISOString().split("T")[0] : undefined,
    };
    setTodos(todos.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    await updateTodo(id, updates);
  };

  const handleDelete = async (id: string) => {
    // Soft delete: set deletedAt
    setTodos(todos.map((todo) => todo.id === id ? { ...todo, deletedAt: new Date().toISOString() } : todo));
    await deleteTodo(id);
  } 

  const handleAdd = async (text: string, category: "today" | "backlog") => {
    const ungroupedTodos = todos.filter(
      (t) => t.category === category && (!t.group || t.group === "Ungrouped")
    );
    const maxOrder = ungroupedTodos.length > 0
      ? Math.max(...ungroupedTodos.map((t) => t.order))
      : -1;
    const newTodo = {
      summary: text,
      description: "",
      completed: false,
      category,
      dueDate: "",
      starred: false,
      repeatDays: 0,
      group: "",
      priority: "" as "" | "!" | "!!" | "!!!",
      order: maxOrder + 1,
    };
    await addTodo(user.id, newTodo);
    // Refetch todos from backend to ensure state is correct
    const updatedTodos = await fetchTodos(user.id);
    setTodos(updatedTodos);
  };

  const handleUpdate = async (id: string, updates: Partial<Todo>) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, ...updates } : todo
      )
    );
    await updateTodo(id, updates);
  };

  const handleMove = async (dragId: string, hoverId: string, dragGroup: string, hoverGroup: string) => {
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
      // Persist order changes
      for (const t of newGroupTodos) {
        await updateTodo(t.id, { order: newGroupTodos.findIndex((x) => x.id === t.id) });
      }
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
      // Persist order changes - update todos that had their group or order change
      for (let i = 0; i < finalTodos.length; i++) {
        const originalTodo = todos[todos.findIndex((t) => t.id === finalTodos[i].id)];
        const updatedTodo = finalTodos[i];
        
        // Check if group or order changed
        if (originalTodo && (originalTodo.group !== updatedTodo.group || originalTodo.order !== updatedTodo.order)) {
          await updateTodo(updatedTodo.id, { 
            group: updatedTodo.group,
            order: updatedTodo.order,
          });
        }
      }
    }
  };

  const handleMoveGroup = async (dragGroup: string, hoverGroup: string, insertAfter: boolean = false) => {
    if (dragGroup === hoverGroup) return;

    // Create new group order
    const newGroupOrder = [...groupOrder];
    const dragIndex = newGroupOrder.indexOf(dragGroup);
    const hoverIndex = newGroupOrder.indexOf(hoverGroup);

    // If groups not in the current order array, add them
    if (dragIndex === -1) {
      newGroupOrder.push(dragGroup);
    }
    if (hoverIndex === -1) {
      newGroupOrder.push(hoverGroup);
    }

    // Get current indices (in case they were added above)
    const currentDragIndex = newGroupOrder.indexOf(dragGroup);
    const currentHoverIndex = newGroupOrder.indexOf(hoverGroup);

    // Reorder
    newGroupOrder.splice(currentDragIndex, 1);
    const insertIndex = insertAfter ? currentHoverIndex + 1 : currentHoverIndex;
    // Adjust insertion index if we removed an item before it
    const adjustedInsertIndex = currentDragIndex < currentHoverIndex ? insertIndex - 1 : insertIndex;
    newGroupOrder.splice(adjustedInsertIndex, 0, dragGroup);

    setGroupOrder(newGroupOrder);

    // Persist order
    try {
      await updateGroupOrder(user.id, { backlog: newGroupOrder });
    } catch (err) {
      console.error("Failed to save group order:", err);
    }
  };

  if (loadingUser || loadingTodos) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
  if (!user) {
    return <AuthForm onAuth={() => getCurrentUser().then(({ data }) => setUser(data?.user || null))} />;
  }
  return (
    <>
      <button onClick={() => { signOut(); setUser(null); }} className="absolute top-4 right-4 bg-zinc-200 px-4 py-2 rounded">Sign Out</button>
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
            onMoveGroup={handleMoveGroup}
            groupOrder={groupOrder}
          />
        </div>
      </DndProvider>
    </>
  );
}