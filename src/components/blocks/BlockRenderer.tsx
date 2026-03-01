import type { Block } from '../../types';
import HeadingRenderer from './HeadingRenderer';
import TextRenderer from './TextRenderer';
import ImageRenderer from './ImageRenderer';
import ButtonRenderer from './ButtonRenderer';
import FormRenderer from './FormRenderer';
import SpacerRenderer from './SpacerRenderer';
import DividerRenderer from './DividerRenderer';

interface Props {
  block: Block;
  editable?: boolean;
  onUpdate?: (props: Record<string, unknown>) => void;
}

export default function BlockRenderer({ block, editable, onUpdate }: Props) {
  switch (block.type) {
    case 'heading':
      return <HeadingRenderer block={block} editable={editable} onUpdate={onUpdate} />;
    case 'text':
      return <TextRenderer block={block} editable={editable} onUpdate={onUpdate} />;
    case 'image':
      return <ImageRenderer block={block} />;
    case 'button':
      return <ButtonRenderer block={block} />;
    case 'form':
      return <FormRenderer block={block} />;
    case 'spacer':
      return <SpacerRenderer block={block} />;
    case 'divider':
      return <DividerRenderer block={block} />;
    default:
      return <div className="p-4 bg-red-50 text-red-500 rounded">Unknown block type</div>;
  }
}
