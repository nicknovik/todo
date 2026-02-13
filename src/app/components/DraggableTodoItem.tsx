import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { TodoItem } from "./TodoItem";
import type { Todo } from "../types";
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
  const dragRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: "TODO",
    item: { id: todo.id, index, groupName },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop<DragItem>({
    accept: "TODO",
    hover: (item: DragItem, monitor) => {
      if (!dropRef.current) {
        return;
      }
      
      const dragId = item.id;
      const hoverId = todo.id;

      if (dragId === hoverId) {
        return;
      }

      onMove(dragId, hoverId, item.groupName, groupName);
      // Update the item so we don't trigger multiple moves
      item.groupName = groupName;
    },
    drop: (item: DragItem) => {
      // The move already happened in hover, drop confirms the final position
      const dragId = item.id;
      const hoverId = todo.id;

      if (dragId !== hoverId) {
        onMove(dragId, hoverId, item.groupName, groupName);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  });

  drag(dragRef);
  drop(dropRef);

  return (
    <div
      ref={preview}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="relative"
    >
      <div ref={dropRef}>
        <div className="flex items-center gap-1">
          <div
            ref={dragRef}
            className="cursor-move text-zinc-400 hover:text-zinc-600"
          >
          <GripVertical className="h-3 w-3" />
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
    </div>
  );
}
