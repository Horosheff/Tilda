import {
  Type,
  AlignLeft,
  ImageIcon,
  MousePointerClick,
  Columns2,
  FileText,
  ArrowUpDown,
  Minus,
} from 'lucide-react';
import { createBlock } from '../../store/blockFactory';
import { usePageStore } from '../../store/pageStore';
import type { BlockType } from '../../types';

const blockTypes: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: 'heading', label: 'Заголовок', icon: <Type size={20} /> },
  { type: 'text', label: 'Текст', icon: <AlignLeft size={20} /> },
  { type: 'image', label: 'Изображение', icon: <ImageIcon size={20} /> },
  { type: 'button', label: 'Кнопка', icon: <MousePointerClick size={20} /> },
  { type: 'columns', label: 'Колонки', icon: <Columns2 size={20} /> },
  { type: 'form', label: 'Форма', icon: <FileText size={20} /> },
  { type: 'spacer', label: 'Отступ', icon: <ArrowUpDown size={20} /> },
  { type: 'divider', label: 'Разделитель', icon: <Minus size={20} /> },
];

export default function BlockPanel() {
  const addBlock = usePageStore((s) => s.addBlock);

  return (
    <div className="p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-1">
        Блоки
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {blockTypes.map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => addBlock(createBlock(type))}
            className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 transition-all text-gray-600 hover:text-indigo-600 cursor-pointer"
          >
            {icon}
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
