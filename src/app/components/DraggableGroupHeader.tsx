import { useRef, useState } from "react";
import { useDrag, useDrop } from "react-dnd";
import { GripVertical, Pencil } from "lucide-react";

interface DraggableGroupHeaderProps {
  groupName: string;
  groupIndex: number;
  onMoveGroup: (dragGroup: string, hoverGroup: string, insertAfter?: boolean) => void;
  onRenameGroup?: (oldName: string, newName: string) => void;
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
  onRenameGroup,
  color = "bg-zinc-100",
  icon,
  isDropTarget = false,
}: DraggableGroupHeaderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(groupName);
  const [isHovered, setIsHovered] = useState(false);

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

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditValue(groupName);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSave = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== groupName && onRenameGroup) {
      onRenameGroup(groupName, trimmedValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setEditValue(groupName);
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  return (
    <div ref={ref}>
      <div
        style={{ opacity: isDragging ? 0.5 : 1 }}
        className={`flex items-center gap-1.5 px-2 py-1 ${color} rounded-md ${!isEditing ? 'cursor-move' : ''} hover:shadow-sm transition-shadow`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {!isEditing && <GripVertical className="h-4 w-4 text-zinc-400" />}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="text-xs font-semibold text-zinc-700 flex-1 bg-white border border-zinc-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <h3 className="text-xs font-semibold text-zinc-700 flex-1">
              {icon && <span className="mr-1">{icon}</span>}
              {groupName}
            </h3>
            {isHovered && onRenameGroup && (
              <button
                onClick={handleEditClick}
                className="p-0.5 hover:bg-zinc-200 rounded transition-colors"
                aria-label="Edit group name"
              >
                <Pencil className="h-3 w-3 text-zinc-500" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
