import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { usePageStore } from '../../store/pageStore';
import SortableBlock from './SortableBlock';

export default function Canvas() {
  const page = usePageStore((s) => s.page);
  const moveBlock = usePageStore((s) => s.moveBlock);
  const selectBlock = usePageStore((s) => s.selectBlock);
  const selectedBlockId = usePageStore((s) => s.selectedBlockId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = page.blocks.findIndex((b) => b.id === active.id);
    const newIndex = page.blocks.findIndex((b) => b.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      moveBlock(oldIndex, newIndex);
    }
  };

  return (
    <div
      className="flex-1 overflow-y-auto bg-gray-100 p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) selectBlock(null);
      }}
    >
      <div
        className="mx-auto bg-white rounded-xl shadow-sm min-h-[600px] border border-gray-200"
        style={{ maxWidth: `${page.maxWidth}px` }}
      >
        {page.blocks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[600px] text-gray-400">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-lg font-medium mb-1">Пустая страница</p>
            <p className="text-sm">
              Добавьте блоки из панели слева или используйте AI для генерации
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={page.blocks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="p-6 space-y-1">
                {page.blocks.map((block) => (
                  <SortableBlock
                    key={block.id}
                    block={block}
                    isSelected={selectedBlockId === block.id}
                    onSelect={() => selectBlock(block.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
