import { useState } from "react";
import { Checkbox } from "./ui/checkbox";
import { Trash2, Star, Repeat, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";

export interface Todo {
  id: string;
  summary: string;
  description: string;
  completed: boolean;
  category: "today" | "backlog";
  dueDate: string;
  starred: boolean;
  repeatDays: number;
  group: string;
  priority: "" | "!" | "!!" | "!!!";
  order: number;
  completedAt?: string;
}

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
}

export function TodoItem({ todo, onToggle, onDelete, onUpdate }: TodoItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editData, setEditData] = useState(todo);

  const handleExpand = () => {
    setIsExpanded(true);
    setEditData(todo);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    onUpdate(todo.id, editData);
  };

  const toggleStar = () => {
    setEditData({ ...editData, starred: !editData.starred });
  };

  const togglePriority = () => {
    const priorities: Array<"" | "!" | "!!" | "!!!"> = ["", "!", "!!", "!!!"];
    const currentIndex = priorities.indexOf(editData.priority);
    const nextIndex = (currentIndex + 1) % priorities.length;
    setEditData({ ...editData, priority: priorities[nextIndex] });
  };

  if (isExpanded) {
    return (
      <div className="border border-zinc-200 rounded-lg p-4 bg-white space-y-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={editData.completed}
            onCheckedChange={() => setEditData({ ...editData, completed: !editData.completed })}
            id={`todo-expanded-${todo.id}`}
            className="mt-1"
          />
          <div className="flex-1 space-y-4">
            <div>
              <Label htmlFor={`summary-${todo.id}`}>Summary</Label>
              <Input
                id={`summary-${todo.id}`}
                value={editData.summary}
                onChange={(e) => setEditData({ ...editData, summary: e.target.value })}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor={`description-${todo.id}`}>Description</Label>
              <Textarea
                id={`description-${todo.id}`}
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="mt-1 min-h-24"
                placeholder="Add details..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`duedate-${todo.id}`}>Due date</Label>
                <Input
                  id={`duedate-${todo.id}`}
                  type="date"
                  value={editData.dueDate}
                  onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor={`repeat-${todo.id}`}>Repeat every X days</Label>
                <Input
                  id={`repeat-${todo.id}`}
                  type="number"
                  min="0"
                  value={editData.repeatDays}
                  onChange={(e) => setEditData({ ...editData, repeatDays: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor={`group-${todo.id}`}>Group</Label>
              <Input
                id={`group-${todo.id}`}
                value={editData.group}
                onChange={(e) => setEditData({ ...editData, group: e.target.value })}
                className="mt-1"
                placeholder="e.g., Work, Personal..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleStar}
                className={editData.starred ? "text-yellow-500" : "text-zinc-400"}
              >
                <Star className={`h-5 w-5 ${editData.starred ? "fill-yellow-500" : ""}`} />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={togglePriority}
                className="text-zinc-700"
              >
                {editData.priority ? (
                  <span className="text-red-500 font-bold">{editData.priority}</span>
                ) : (
                  <AlertCircle className="h-5 w-5 text-zinc-400" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onDelete(todo.id);
            }}
            className="text-red-500 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
          <Button
            size="sm"
            onClick={handleCollapse}
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-50 group transition-colors cursor-pointer"
      onClick={handleExpand}
    >
      <Checkbox
        checked={todo.completed}
        onCheckedChange={(e) => {
          e?.stopPropagation?.();
          onToggle(todo.id);
        }}
        onClick={(e) => e.stopPropagation()}
        id={`todo-${todo.id}`}
      />
      <div className="flex-1 flex items-center gap-2">
        <label
          htmlFor={`todo-${todo.id}`}
          className={`flex-1 cursor-pointer select-none ${
            todo.completed ? "line-through text-zinc-400" : "text-zinc-900"
          }`}
          onClick={(e) => e.preventDefault()}
        >
          {todo.summary}
        </label>
        {todo.starred && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
        {todo.priority && <span className="text-red-500 text-sm font-bold">{todo.priority}</span>}
        {todo.repeatDays > 0 && <Repeat className="h-4 w-4 text-zinc-400" />}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(todo.id);
        }}
      >
        <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-500" />
        <span className="sr-only">Delete</span>
      </Button>
    </div>
  );
}