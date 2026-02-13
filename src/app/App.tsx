import { useState, useEffect, useCallback } from "react";
import { AuthForm } from "./components/AuthForm";
import { getCurrentUser, signOut } from "./auth";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Sidebar } from "./components/Sidebar";
import { TodoList } from "./components/TodoList";
import {
  fetchTodos,
  addTodo,
  updateTodo,
  softDeleteTodo,
  fetchGroupOrder,
  updateGroupOrder,
  purgeOldDeletedTodos,
  batchUpdateOrder,
} from "./supabaseTodos";
import { fetchTodayCalendarEvents } from "./googleCalendarService";
import type { CalendarEvent } from "./googleCalendarService";
import type { Todo, ViewType } from "./types";
import { displayGroup, storedGroup } from "./types";
import { supabase } from "../supabaseClient";
import type { User } from "@supabase/supabase-js";

/** Number of days after soft-deletion before permanent removal. */
const PURGE_AFTER_DAYS = 365;

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>("today");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [groupOrder, setGroupOrder] = useState<string[]>([]);
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[] | null>(null);

  // ── Auth lifecycle ───────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoadingUser(false);
      })
      .catch(() => {
        setUser(null);
        setLoadingUser(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoadingUser(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Load todos & group order when user changes ───────────────────────

  useEffect(() => {
    if (!user?.id) {
      setTodos([]);
      setGroupOrder([]);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoadingTodos(true);
      try {
        // Housekeeping: permanently remove very old soft-deleted items
        await purgeOldDeletedTodos(user!.id, PURGE_AFTER_DAYS);

        const [loadedTodos, orders] = await Promise.all([
          fetchTodos(user!.id),
          fetchGroupOrder(user!.id).catch(() => ({} as Record<string, string[]>)),
        ]);

        if (!cancelled) {
          setTodos(loadedTodos);
          setGroupOrder(orders.backlog ?? []);
        }
      } catch (error) {
        console.error("Failed to load todos:", error);
      } finally {
        if (!cancelled) setLoadingTodos(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  // ── Calendar events (only on the "today" view) ──────────────────────
  // NOTE: We intentionally do NOT call getSession() inside an
  // onAuthStateChange callback. Supabase v2 awaits all subscriber
  // callbacks during init, and getSession() awaits the same init
  // promise — causing a deadlock on page refresh.

  useEffect(() => {
    if (!user?.id || currentView !== "today") return;

    let cancelled = false;

    fetchTodayCalendarEvents()
      .then((events) => { if (!cancelled) setCalendarEvents(events); })
      .catch(() => { if (!cancelled) setCalendarEvents(null); });

    return () => { cancelled = true; };
  }, [user?.id, currentView]);

  // ── Page title ───────────────────────────────────────────────────────

  useEffect(() => {
    const VIEW_TITLES: Record<ViewType, string> = {
      today: "Today",
      backlog: "Backlog",
      completed: "Completed",
      deleted: "Deleted",
    };
    document.title = `Todo – ${VIEW_TITLES[currentView]}`;
  }, [currentView]);

  // ── Handlers ──────────────────────────────────────────────────────────

  const handleToggle = useCallback(
    async (id: string) => {
      const todo = todos.find((t) => t.id === id);
      if (!todo || !user) return;

      const isCompletingNow = !todo.completed;
      const todayStr = new Date().toISOString().split("T")[0];
      const updates: Partial<Todo> = {
        completed: isCompletingNow,
        completedAt: isCompletingNow ? todayStr : undefined,
      };

      // Optimistic UI update
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));

      try {
        await updateTodo(id, updates);

        // Recurring items: spawn or remove the next occurrence
        if (todo.repeatDays > 0) {
          if (isCompletingNow) {
            const completionDate = new Date(todayStr);
            const nextDue = new Date(completionDate);
            nextDue.setDate(nextDue.getDate() + todo.repeatDays);

            const siblings = todos.filter(
              (t) => t.category === todo.category && t.group === todo.group && !t.deletedAt,
            );
            const maxOrder = siblings.length > 0 ? Math.max(...siblings.map((t) => t.order)) : -1;

            await addTodo(user.id, {
              summary: todo.summary,
              description: todo.description,
              completed: false,
              category: todo.category,
              dueDate: nextDue.toISOString().split("T")[0],
              starred: false,
              repeatDays: todo.repeatDays,
              group: todo.group,
              priority: todo.priority,
              order: maxOrder + 1,
              recurringParentId: todo.id,
            });

            // Refetch so the new recurring item appears with its server-assigned id
            const refreshed = await fetchTodos(user.id);
            setTodos(refreshed);
          } else {
            // Uncompleting: remove the child occurrence that was created
            const child = todos.find(
              (t) => t.recurringParentId === todo.id && !t.deletedAt,
            );
            if (child) {
              await softDeleteTodo(child.id);
              setTodos((prev) =>
                prev.map((t) =>
                  t.id === child.id ? { ...t, deletedAt: new Date().toISOString() } : t,
                ),
              );
            }
          }
        }
      } catch (error) {
        console.error("Failed to toggle todo:", error);
        // Revert on failure
        setTodos((prev) =>
          prev.map((t) => (t.id === id ? { ...t, completed: todo.completed, completedAt: todo.completedAt } : t)),
        );
      }
    },
    [todos, user],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const now = new Date().toISOString();
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, deletedAt: now } : t)));

      try {
        await softDeleteTodo(id);
      } catch (error) {
        console.error("Failed to delete todo:", error);
        setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, deletedAt: null } : t)));
      }
    },
    [],
  );

  const handleAdd = useCallback(
    async (text: string, category: "today" | "backlog") => {
      if (!user) return;

      const ungrouped = todos.filter(
        (t) => t.category === category && !t.group,
      );
      const maxOrder = ungrouped.length > 0 ? Math.max(...ungrouped.map((t) => t.order)) : -1;

      try {
        const created = await addTodo(user.id, {
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
          recurringParentId: null,
        });

        if (created) {
          setTodos((prev) => [...prev, created]);
        } else {
          // Fallback: refetch if server didn't return the new row
          const refreshed = await fetchTodos(user.id);
          setTodos(refreshed);
        }
      } catch (error) {
        console.error("Failed to add todo:", error);
      }
    },
    [todos, user],
  );

  const handleUpdate = useCallback(
    async (id: string, updates: Partial<Todo>) => {
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));

      try {
        await updateTodo(id, updates);
      } catch (error) {
        console.error("Failed to update todo:", error);
      }
    },
    [],
  );

  const handleMove = useCallback(
    async (dragId: string, hoverId: string, dragGroup: string, hoverGroup: string) => {
      const dragTodo = todos.find((t) => t.id === dragId);
      const hoverTodo = todos.find((t) => t.id === hoverId);
      if (!dragTodo || !hoverTodo) return;

      const snapshot = todos; // Keep pre-move snapshot for batch diff

      if (dragGroup === hoverGroup && dragTodo.category === hoverTodo.category) {
        // ── Reorder within the same group ──────────────────────────
        const groupTodos = todos
          .filter((t) => t.category === dragTodo.category && displayGroup(t.group) === dragGroup)
          .sort((a, b) => a.order - b.order);

        const dragIdx = groupTodos.findIndex((t) => t.id === dragId);
        const hoverIdx = groupTodos.findIndex((t) => t.id === hoverId);
        if (dragIdx === -1 || hoverIdx === -1) return;

        const reordered = [...groupTodos];
        const [removed] = reordered.splice(dragIdx, 1);
        reordered.splice(hoverIdx, 0, removed);

        const updated = todos.map((todo) => {
          const newIdx = reordered.findIndex((t) => t.id === todo.id);
          return newIdx !== -1 ? { ...todo, order: newIdx } : todo;
        });

        setTodos(updated);
        await batchUpdateOrder(snapshot, updated);
      } else {
        // ── Move to a different group ──────────────────────────────
        const targetTodos = todos
          .filter((t) => t.category === hoverTodo.category && displayGroup(t.group) === hoverGroup)
          .sort((a, b) => a.order - b.order);

        const hoverIdx = targetTodos.findIndex((t) => t.id === hoverId);

        // Update dragged item's group/category and shift target group orders
        let updated = todos.map((todo) => {
          if (todo.id === dragId) {
            return {
              ...todo,
              group: storedGroup(hoverGroup),
              category: hoverTodo.category,
              order: hoverIdx,
            };
          }
          if (
            displayGroup(todo.group) === hoverGroup &&
            todo.category === hoverTodo.category &&
            todo.order >= hoverIdx &&
            todo.id !== hoverId
          ) {
            return { ...todo, order: todo.order + 1 };
          }
          return todo;
        });

        // Re-number the source group to close the gap left by the dragged item
        const sourceTodos = updated
          .filter(
            (t) =>
              t.category === dragTodo.category &&
              displayGroup(t.group) === dragGroup &&
              t.id !== dragId,
          )
          .sort((a, b) => a.order - b.order);

        updated = updated.map((todo) => {
          const sourceIdx = sourceTodos.findIndex((t) => t.id === todo.id);
          if (
            sourceIdx !== -1 &&
            displayGroup(todo.group) === dragGroup &&
            todo.category === dragTodo.category
          ) {
            return { ...todo, order: sourceIdx };
          }
          return todo;
        });

        setTodos(updated);
        await batchUpdateOrder(snapshot, updated);
      }
    },
    [todos],
  );

  const handleMoveGroup = useCallback(
    async (dragGroup: string, hoverGroup: string, insertAfter = false) => {
      if (dragGroup === hoverGroup || !user) return;

      const next = [...groupOrder];

      // Ensure both groups are tracked
      if (!next.includes(dragGroup)) next.push(dragGroup);
      if (!next.includes(hoverGroup)) next.push(hoverGroup);

      const dragIdx = next.indexOf(dragGroup);
      const hoverIdx = next.indexOf(hoverGroup);

      next.splice(dragIdx, 1);
      const insertIdx = insertAfter ? hoverIdx + 1 : hoverIdx;
      const adjusted = dragIdx < hoverIdx ? insertIdx - 1 : insertIdx;
      next.splice(adjusted, 0, dragGroup);

      setGroupOrder(next);

      try {
        await updateGroupOrder(user.id, { backlog: next });
      } catch (error) {
        console.error("Failed to save group order:", error);
        setGroupOrder(groupOrder); // Revert
      }
    },
    [groupOrder, user],
  );

  const handleRenameGroup = useCallback(
    async (oldName: string, newName: string) => {
      if (oldName === newName || !newName.trim() || !user) return;

      const prevTodos = todos;
      const prevOrder = groupOrder;
      const newStoredGroup = storedGroup(newName);

      // Optimistic UI updates
      const updatedTodos = todos.map((todo) =>
        displayGroup(todo.group) === oldName
          ? { ...todo, group: newStoredGroup }
          : todo,
      );
      const updatedOrder = groupOrder.map((g) => (g === oldName ? newName : g));

      setTodos(updatedTodos);
      setGroupOrder(updatedOrder);

      try {
        const affected = prevTodos.filter((t) => displayGroup(t.group) === oldName);
        await Promise.all([
          ...affected.map((t) => updateTodo(t.id, { group: newStoredGroup })),
          updateGroupOrder(user.id, { backlog: updatedOrder }),
        ]);
      } catch (error) {
        console.error("Failed to rename group:", error);
        setTodos(prevTodos);
        setGroupOrder(prevOrder);
      }
    },
    [todos, groupOrder, user],
  );

  const handleRefreshCalendar = useCallback(async () => {
    const events = await fetchTodayCalendarEvents();
    setCalendarEvents(events);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────

  if (loadingUser || loadingTodos) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return (
      <AuthForm
        onAuth={() =>
          getCurrentUser().then(({ data }) => setUser(data?.user ?? null))
        }
      />
    );
  }

  return (
    <>
      <button
        onClick={() => { signOut(); setUser(null); }}
        className="absolute top-4 right-4 bg-zinc-200 px-4 py-2 rounded"
      >
        Sign Out
      </button>

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
            onRenameGroup={handleRenameGroup}
            groupOrder={groupOrder}
            calendarEvents={calendarEvents ?? null}
            onRefreshCalendar={handleRefreshCalendar}
          />
        </div>
      </DndProvider>
    </>
  );
}