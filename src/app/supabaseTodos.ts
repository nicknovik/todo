import { supabase } from "../supabaseClient";
import { Todo } from "./components/TodoItem";

const mapTodoRow = (row: any): Todo => ({
  id: row.id,
  summary: row.summary,
  description: row.description || "",
  completed: row.completed,
  category: row.category,
  dueDate: row.due_date || "",
  starred: row.starred,
  repeatDays: row.repeat_days,
  group: row.group_name || "",
  priority: row.priority || "",
  order: row.order_num,
  completedAt: row.completed_at || undefined,
  deletedAt: row.deleted_at || null,
  recurringParentId: row.recurring_parent_id || null,
});

export async function fetchTodos(userId: string): Promise<Todo[]> {
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("user_id", userId)
    .order("order_num", { ascending: true });
  if (error) throw error;
  return data?.map(mapTodoRow) || [];
}

export async function addTodo(userId: string, todo: Omit<Todo, "id">) {
  const { data, error } = await supabase
    .from("todos")
    .insert([
      {
        user_id: userId,
        summary: todo.summary,
        description: todo.description,
        completed: todo.completed,
        category: todo.category,
        due_date: todo.dueDate || null,
        starred: todo.starred,
        repeat_days: todo.repeatDays,
        group_name: todo.group || null,
        priority: todo.priority,
        order_num: todo.order,
        completed_at: todo.completedAt || null,
        recurring_parent_id: todo.recurringParentId || null,
      },
    ])
    .select();
  if (error) throw error;
  return data?.[0] ? mapTodoRow(data[0]) : null;
}

export async function updateTodo(todoId: string, updates: Partial<Todo>) {
  const updateData: any = {};
  
  if (updates.summary !== undefined) updateData.summary = updates.summary;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.completed !== undefined) updateData.completed = updates.completed;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate || null;
  if (updates.starred !== undefined) updateData.starred = updates.starred;
  if (updates.repeatDays !== undefined) updateData.repeat_days = updates.repeatDays;
  if (updates.group !== undefined) updateData.group_name = updates.group || null;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.order !== undefined) updateData.order_num = updates.order;
  if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt || null;
  if (updates.recurringParentId !== undefined) updateData.recurring_parent_id = updates.recurringParentId || null;

  const { error } = await supabase
    .from("todos")
    .update(updateData)
    .eq("id", todoId);
  if (error) throw error;
}

export async function deleteTodo(todoId: string) {
  // Soft delete: set deleted_at to now
  const { error } = await supabase
    .from("todos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", todoId);
  if (error) throw error;
}

export async function fetchGroupOrder(userId: string): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from("user_group_orders")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows found
  return data?.group_orders || {};
}

export async function updateGroupOrder(userId: string, groupOrders: Record<string, string[]>) {
  const { error } = await supabase
    .from("user_group_orders")
    .upsert(
      {
        user_id: userId,
        group_orders: groupOrders,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  if (error) throw error;
}
