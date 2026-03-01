import { usePageStore } from '../../store/pageStore';
import type { Block } from '../../types';
import { Trash2 } from 'lucide-react';

export default function PropertiesPanel() {
  const selectedBlockId = usePageStore((s) => s.selectedBlockId);
  const page = usePageStore((s) => s.page);
  const updateBlock = usePageStore((s) => s.updateBlock);
  const removeBlock = usePageStore((s) => s.removeBlock);

  const block = page.blocks.find((b) => b.id === selectedBlockId);

  if (!block) {
    return (
      <div className="p-4 text-center text-gray-400 text-sm">
        Выберите блок для редактирования
      </div>
    );
  }

  const update = (props: Record<string, unknown>) => {
    updateBlock(block.id, { props: { ...block.props, ...props } } as Partial<Block>);
  };

  return (
    <div className="p-3 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Свойства
        </h3>
        <button
          onClick={() => removeBlock(block.id)}
          className="p-1.5 rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
          title="Удалить блок"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block capitalize">
        {block.type}
      </div>

      {renderProps(block, update)}
    </div>
  );
}

function renderProps(block: Block, update: (props: Record<string, unknown>) => void) {
  switch (block.type) {
    case 'heading':
      return (
        <div className="space-y-3">
          <Field label="Текст">
            <input
              value={block.props.text}
              onChange={(e) => update({ text: e.target.value })}
              className="input-field"
            />
          </Field>
          <Field label="Уровень">
            <select
              value={block.props.level}
              onChange={(e) => update({ level: Number(e.target.value) })}
              className="input-field"
            >
              <option value={1}>H1</option>
              <option value={2}>H2</option>
              <option value={3}>H3</option>
            </select>
          </Field>
          <Field label="Выравнивание">
            <AlignSelect value={block.props.align} onChange={(v) => update({ align: v })} />
          </Field>
          <Field label="Цвет">
            <input
              type="color"
              value={block.props.color}
              onChange={(e) => update({ color: e.target.value })}
              className="w-full h-8 rounded cursor-pointer"
            />
          </Field>
        </div>
      );

    case 'text':
      return (
        <div className="space-y-3">
          <Field label="Текст">
            <textarea
              value={block.props.text}
              onChange={(e) => update({ text: e.target.value })}
              className="input-field min-h-[80px] resize-y"
              rows={3}
            />
          </Field>
          <Field label="Размер шрифта">
            <input
              type="range"
              min={12}
              max={28}
              value={block.props.fontSize}
              onChange={(e) => update({ fontSize: Number(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{block.props.fontSize}px</span>
          </Field>
          <Field label="Выравнивание">
            <AlignSelect value={block.props.align} onChange={(v) => update({ align: v })} />
          </Field>
          <Field label="Цвет">
            <input
              type="color"
              value={block.props.color}
              onChange={(e) => update({ color: e.target.value })}
              className="w-full h-8 rounded cursor-pointer"
            />
          </Field>
        </div>
      );

    case 'image':
      return (
        <div className="space-y-3">
          <Field label="URL изображения">
            <input
              value={block.props.src}
              onChange={(e) => update({ src: e.target.value })}
              className="input-field"
              placeholder="https://..."
            />
          </Field>
          <Field label="Alt текст">
            <input
              value={block.props.alt}
              onChange={(e) => update({ alt: e.target.value })}
              className="input-field"
            />
          </Field>
          <Field label="Ширина">
            <input
              value={block.props.width}
              onChange={(e) => update({ width: e.target.value })}
              className="input-field"
              placeholder="100% или 600px"
            />
          </Field>
          <Field label="Скругление">
            <input
              type="range"
              min={0}
              max={32}
              value={block.props.borderRadius}
              onChange={(e) => update({ borderRadius: Number(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{block.props.borderRadius}px</span>
          </Field>
        </div>
      );

    case 'button':
      return (
        <div className="space-y-3">
          <Field label="Текст">
            <input
              value={block.props.text}
              onChange={(e) => update({ text: e.target.value })}
              className="input-field"
            />
          </Field>
          <Field label="URL">
            <input
              value={block.props.url}
              onChange={(e) => update({ url: e.target.value })}
              className="input-field"
            />
          </Field>
          <Field label="Стиль">
            <select
              value={block.props.variant}
              onChange={(e) => update({ variant: e.target.value })}
              className="input-field"
            >
              <option value="filled">Заливка</option>
              <option value="outlined">Контур</option>
              <option value="text">Текст</option>
            </select>
          </Field>
          <Field label="Выравнивание">
            <AlignSelect value={block.props.align} onChange={(v) => update({ align: v })} />
          </Field>
          <Field label="Цвет текста">
            <input
              type="color"
              value={block.props.color}
              onChange={(e) => update({ color: e.target.value })}
              className="w-full h-8 rounded cursor-pointer"
            />
          </Field>
          <Field label="Цвет фона">
            <input
              type="color"
              value={block.props.bgColor}
              onChange={(e) => update({ bgColor: e.target.value })}
              className="w-full h-8 rounded cursor-pointer"
            />
          </Field>
        </div>
      );

    case 'spacer':
      return (
        <div className="space-y-3">
          <Field label="Высота">
            <input
              type="range"
              min={8}
              max={120}
              value={block.props.height}
              onChange={(e) => update({ height: Number(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{block.props.height}px</span>
          </Field>
        </div>
      );

    case 'divider':
      return (
        <div className="space-y-3">
          <Field label="Цвет">
            <input
              type="color"
              value={block.props.color}
              onChange={(e) => update({ color: e.target.value })}
              className="w-full h-8 rounded cursor-pointer"
            />
          </Field>
          <Field label="Толщина">
            <input
              type="range"
              min={1}
              max={6}
              value={block.props.thickness}
              onChange={(e) => update({ thickness: Number(e.target.value) })}
              className="w-full"
            />
            <span className="text-xs text-gray-500">{block.props.thickness}px</span>
          </Field>
          <Field label="Ширина">
            <input
              value={block.props.width}
              onChange={(e) => update({ width: e.target.value })}
              className="input-field"
            />
          </Field>
        </div>
      );

    case 'form':
      return (
        <div className="space-y-3">
          <Field label="Текст кнопки">
            <input
              value={block.props.submitText}
              onChange={(e) => update({ submitText: e.target.value })}
              className="input-field"
            />
          </Field>
          <Field label="Цвет фона">
            <input
              type="color"
              value={block.props.bgColor}
              onChange={(e) => update({ bgColor: e.target.value })}
              className="w-full h-8 rounded cursor-pointer"
            />
          </Field>
          <p className="text-xs text-gray-400">
            {block.props.fields.length} поле(й)
          </p>
        </div>
      );

    default:
      return null;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function AlignSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1">
      {['left', 'center', 'right'].map((a) => (
        <button
          key={a}
          onClick={() => onChange(a)}
          className={`flex-1 py-1.5 text-xs rounded-md border transition-colors cursor-pointer ${
            value === a
              ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
              : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          {a === 'left' ? '←' : a === 'center' ? '↔' : '→'}
        </button>
      ))}
    </div>
  );
}
