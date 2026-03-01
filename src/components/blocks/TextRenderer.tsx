import type { TextBlock } from '../../types';

interface Props {
  block: TextBlock;
  editable?: boolean;
  onUpdate?: (props: Partial<TextBlock['props']>) => void;
}

export default function TextRenderer({ block, editable, onUpdate }: Props) {
  const { text, align, fontSize, color } = block.props;

  return (
    <p
      className="py-1 leading-relaxed whitespace-pre-wrap"
      style={{ textAlign: align, fontSize: `${fontSize}px`, color }}
      contentEditable={editable}
      suppressContentEditableWarning
      onBlur={(e) => onUpdate?.({ text: (e.target as HTMLElement).innerText })}
    >
      {text}
    </p>
  );
}
