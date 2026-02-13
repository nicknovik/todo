import { supabase } from "../supabaseClient";
import type { Todo } from "./types";

// ── Field mapping ──────────────────────────────────────────────────────
// Maps Todo property names to their corresponding Supabase column names.
// Used by both `addTodo` and `updateTodo` so the mapping is defined once.

const FIELD_TO_COLUMN: Record<string, string> = {
  summary: "summary",
  description: "description",
  completed: "completed",
  category: "category",
  dueDate: "due_date",
  starred: "starred",
  repeatDays: "repeat_days",
  group: "group_name",
  priority: "priority",
  order: "order_num",
  completedAt: "completed_at",
  recurringParentId: "recurring_parent_id",
};

/** Fields that should be stored as `null` when empty/falsy. */
const NULLABLE_FIELDS = new Set([
  "dueDate",
  "group",
  "completedAt",
  "recurringParentId",
]);

/** Convert a Supabase row into a `Todo` object. */
function mapRow(row: Record<string, unknown>): Todo {
  return {
    id: row.id as string,
    summary: row.summary as string,
    description: (row.description as string) || "",
    completed: row.completed as boolean,
    category: row.category as Todo["category"],
    dueDate: (row.due_date as string) || "",
    starred: row.starred as boolean,
    repeatDays: row.repeat_days as number,
    group: (row.group_name as string) || "",
    priority: (row.priority as Todo["priority"]) || "",
    order: row.order_num as number,
    completedAt: (row.completed_at as string) || undefined,
    deletedAt: (row.deleted_at as string) || null,
    recurringParentId: (row.recurring_parent_id as string) || null,
  };
}

/**
 * Convert a partial `Todo` object into a Supabase column payload.
 * Only includes fields that are present in `updates`.
 */
function toColumnPayload(updates: Partial<Todo>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [field, column] of Object.entries(FIELD_TO_COLUMN)) {
    if (field in updates) {
      const value = (updates as Record<string, unknown>)[field];
      payload[column] = NULLABLE_FIELDS.has(field) ? value || null : value;
    }
  }
  return payload;
}

// ── CRUD operations ────────────────────────────────────────────────────

export async function fetchTodos(userId: string): Promise<Todo[]> {
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("user_id", userId)
    .order("order_num", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function addTodo(
  userId: string,
  todo: Omit<Todo, "id">,
): Promise<Todo | null> {
  const row = {
    user_id: userId,
    ...toColumnPayload(todo),
    deleted_at: null,
  };

  const { data, error } = await supabase
    .from("todos")
    .insert([row])
    .select();
  if (error) throw error;
  return data?.[0] ? mapRow(data[0]) : null;
}

export async function updateTodo(
  todoId: string,
  updates: Partial<Todo>,
): Promise<void> {
  const payload = toColumnPayload(updates);
  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase
    .from("todos")
    .update(payload)
    .eq("id", todoId);
  if (error) throw error;
}

/** Soft-delete a todo by setting its `deleted_at` timestamp. */
export async function softDeleteTodo(todoId: string): Promise<void> {
  const { error } = await supabase
    .from("todos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", todoId);
  if (error) throw error;
}

/**
 * Permanently remove todos that were soft-deleted more than `days` ago.
 * Called once per session during initial data load.
 */
export async function purgeOldDeletedTodos(
  userId: string,
  days: number,
): Promise<void> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("todos")
    .delete()
    .lt("deleted_at", cutoff)
    .eq("user_id", userId);
  if (error) throw error;
}

/**
 * Persist order/group changes for multiple todos in parallel.
 * Only sends updates for todos whose `order` or `group` actually changed.
 */
export async function batchUpdateOrder(
  original: Todo[],
  updated: Todo[],
): Promise<void> {
  const originalMap = new Map(original.map((t) => [t.id, t]));
  const mutations = updated.filter((t) => {
    const prev = originalMap.get(t.id);
    return prev && (prev.order !== t.order || prev.group !== t.group);
  });

  if (mutations.length === 0) return;

  await Promise.all(
    mutations.map((t) => updateTodo(t.id, { order: t.order, group: t.group })),
  );
}

// ── Group ordering ─────────────────────────────────────────────────────

export async function fetchGroupOrder(
  userId: string,
): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from("user_group_orders")
    .select("*")
    .eq("user_id", userId)
    .single();

  // PGRST116 = no rows found — not an error for a new user
  if (error && error.code !== "PGRST116") throw error;
  return (data?.group_orders as Record<string, string[]>) ?? {};
}

export async function updateGroupOrder(
  userId: string,
  groupOrders: Record<string, string[]>,
): Promise<void> {
  const { error } = await supabase
    .from("user_group_orders")
    .upsert(
      {
        user_id: userId,
        group_orders: groupOrders,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}
