import { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import { GripVertical } from "lucide-react";

interface DraggableGroupHeaderProps {
  groupName: string;
  groupIndex: number;
  onMoveGroup: (dragGroup: string, hoverGroup: string, insertAfter?: boolean) => void;
  color?: string;
  icon?: string;
  isDropTarget?: boolean;
}

interface DragGroup {
  groupName: string;
  index: number;
}

export function DraggableGroupHeader({
  groupName,
  groupIndex,
  onMoveGroup,
  color = "bg-zinc-100",
  icon,
  isDropTarget = false,
}: DraggableGroupHeaderProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: "GROUP",
    item: { groupName, index: groupIndex, originalName: groupName },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop<DragGroup>({
    accept: "GROUP",
    hover: (item: DragGroup) => {
      if (!ref.current) {
        return;
      }
      
      // Don't replace items with themselves
      if (item.groupName === groupName) {
        return;
      }

      onMoveGroup(item.groupName, groupName);
      // Update the item's index to reflect its new position
      item.index = groupIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  });

  drag(drop(ref));

  return (
    <div ref={ref}>
      <div
        style={{ opacity: isDragging ? 0.5 : 1 }}
        className={`flex items-center gap-1.5 px-2 py-1 ${color} rounded-md cursor-move hover:shadow-sm transition-shadow`}
      >
        <GripVertical className="h-4 w-4 text-zinc-400" />
        <h3 className="text-xs font-semibold text-zinc-700 flex-1">
          {icon && <span className="mr-1">{icon}</span>}
          {groupName}
        </h3>
      </div>
    </div>
  );
}
