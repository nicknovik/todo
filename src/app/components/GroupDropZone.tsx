import { useRef } from "react";
import { useDrop } from "react-dnd";

interface DragGroup {
  groupName: string;
  index: number;
}

interface GroupDropZoneProps {
  lastGroupName: string;
  onMoveGroup: (dragGroup: string, hoverGroup: string, insertAfter?: boolean) => void;
}

export function GroupDropZone({
  lastGroupName,
  onMoveGroup,
}: GroupDropZoneProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drop] = useDrop<DragGroup>({
    accept: "GROUP",
    hover: (item: DragGroup) => {
      if (item.groupName !== lastGroupName) {
        onMoveGroup(item.groupName, lastGroupName, true);
        item.groupName = lastGroupName;
      }
    },
    drop: (item: DragGroup) => {
      if (item.groupName !== lastGroupName) {
        onMoveGroup(item.groupName, lastGroupName, true);
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.canDrop() && monitor.getItem() !== null,
    }),
  });

  drop(ref);

  return (
    <div 
      ref={ref} 
      className={isDragging ? "h-9 rounded-md border-2 border-dashed border-zinc-300" : "h-2"}
    />
  );
}
