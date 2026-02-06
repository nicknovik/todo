import { supabase } from "../supabaseClient";
import { Todo } from "./components/TodoItem";

export async function fetchTodos(userId: string): Promise<Todo[]> {
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("user_id", userId)
    .order("order_num", { ascending: true });
  if (error) throw error;
  return (
    data?.map((row) => ({
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
    })) || []
  );
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
      },
    ])
    .select();
  if (error) throw error;
  return data?.[0];
}

export async function updateTodo(todoId: string, updates: Partial<Todo>) {
  const { error } = await supabase
    .from("todos")
    .update({
      summary: updates.summary,
      description: updates.description,
      completed: updates.completed,
      category: updates.category,
      due_date: updates.dueDate || null,
      starred: updates.starred,
      repeat_days: updates.repeatDays,
      group_name: updates.group || null,
      priority: updates.priority,
      order_num: updates.order,
      completed_at: updates.completedAt || null,
    })
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
