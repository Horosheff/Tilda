import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import type { Block } from '../../types';
import BlockRenderer from '../blocks/BlockRenderer';
import { usePageStore } from '../../store/pageStore';

interface Props {
  block: Block;
  isSelected: boolean;
  onSelect: () => void;
}

export default function SortableBlock({ block, isSelected, onSelect }: Props) {
  const removeBlock = usePageStore((s) => s.removeBlock);
  const updateBlock = usePageStore((s) => s.updateBlock);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleUpdate = (props: Record<string, unknown>) => {
    updateBlock(block.id, { props: { ...block.props, ...props } } as Partial<Block>);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg transition-all ${
        isSelected
          ? 'ring-2 ring-indigo-500 ring-offset-2'
          : 'hover:ring-1 hover:ring-gray-300 hover:ring-offset-1'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          {...attributes}
          {...listeners}
          className="p-1 rounded bg-white shadow-md border border-gray-200 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </button>
      </div>

      <div className="absolute -right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeBlock(block.id);
          }}
          className="p-1 rounded bg-white shadow-md border border-gray-200 text-red-400 hover:text-red-600 cursor-pointer"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="p-2">
        <BlockRenderer block={block} editable={isSelected} onUpdate={handleUpdate} />
      </div>
    </div>
  );
}
