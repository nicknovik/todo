import { useRef } from "react";
import { useDrop } from "react-dnd";

interface DragItem {
  id: string;
  index: number;
  groupName: string;
}

interface TodoDropZoneProps {
  groupName: string;
  lastTodoId: string | null;
  onMove: (dragId: string, hoverId: string, dragGroup: string, hoverGroup: string) => void;
}

export function TodoDropZone({
  groupName,
  lastTodoId,
  onMove,
}: TodoDropZoneProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [, drop] = useDrop<DragItem>({
    accept: "TODO",
    hover: (item: DragItem) => {
      if (!lastTodoId) {
        return;
      }

      const dragId = item.id;
      const hoverId = lastTodoId;

      if (dragId === hoverId) {
        return;
      }

      onMove(dragId, hoverId, item.groupName, groupName);
      item.groupName = groupName;
    },
  });

  drop(ref);

  return <div ref={ref} className="h-1.5" />;
}
