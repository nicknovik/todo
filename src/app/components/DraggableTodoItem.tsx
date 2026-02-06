import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { TodoItem, Todo } from "./TodoItem";
import { GripVertical } from "lucide-react";

interface DraggableTodoItemProps {
  todo: Todo;
  index: number;
  groupName: string;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Todo>) => void;
  onMove: (dragId: string, hoverId: string, dragGroup: string, hoverGroup: string) => void;
}

interface DragItem {
  id: string;
  index: number;
  groupName: string;
}

export function DraggableTodoItem({
  todo,
  index,
  groupName,
  onToggle,
  onDelete,
  onUpdate,
  onMove,
}: DraggableTodoItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: "TODO",
    item: { id: todo.id, index, groupName },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop<DragItem>({
    accept: "TODO",
    hover: (item: DragItem) => {
      if (!ref.current) {
        return;
      }
      const dragId = item.id;
      const hoverId = todo.id;

      if (dragId === hoverId) {
        return;
      }

      onMove(dragId, hoverId, item.groupName, groupName);
      item.index = index;
      item.groupName = groupName;
    },
  });

  drag(drop(ref));

  return (
    <div
      ref={preview}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="relative"
    >
      <div className="flex items-center gap-2">
        <div
          ref={ref}
          className="cursor-move text-zinc-400 hover:text-zinc-600"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <TodoItem
            todo={todo}
            onToggle={onToggle}
            onDelete={onDelete}
            onUpdate={onUpdate}
          />
        </div>
      </div>
    </div>
  );
}
