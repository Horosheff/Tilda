import type { HeadingBlock } from '../../types';

interface Props {
  block: HeadingBlock;
  editable?: boolean;
  onUpdate?: (props: Partial<HeadingBlock['props']>) => void;
}

export default function HeadingRenderer({ block, editable, onUpdate }: Props) {
  const { text, level, align, color } = block.props;
  const sizes: Record<number, string> = { 1: 'text-4xl font-bold', 2: 'text-3xl font-semibold', 3: 'text-2xl font-medium' };

  const commonProps = {
    className: `${sizes[level]} leading-tight py-2`,
    style: { textAlign: align, color } as React.CSSProperties,
    contentEditable: editable,
    suppressContentEditableWarning: true,
    onBlur: (e: React.FocusEvent<HTMLElement>) => onUpdate?.({ text: e.currentTarget.innerText }),
  };

  if (level === 1) return <h1 {...commonProps}>{text}</h1>;
  if (level === 2) return <h2 {...commonProps}>{text}</h2>;
  return <h3 {...commonProps}>{text}</h3>;
}
