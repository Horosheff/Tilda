import { v4 as uuidv4 } from 'uuid';
import type {
  Block,
  HeadingBlock,
  TextBlock,
  ImageBlock,
  ButtonBlock,
  ColumnsBlock,
  FormBlock,
  SpacerBlock,
  DividerBlock,
  BlockType,
} from '../types';

export function createBlock(type: BlockType): Block {
  const id = uuidv4();
  switch (type) {
    case 'heading':
      return {
        id,
        type: 'heading',
        props: { text: 'Заголовок', level: 1, align: 'center', color: '#1e293b' },
      } as HeadingBlock;
    case 'text':
      return {
        id,
        type: 'text',
        props: {
          text: 'Текст блока. Нажмите, чтобы редактировать.',
          align: 'left',
          fontSize: 16,
          color: '#334155',
        },
      } as TextBlock;
    case 'image':
      return {
        id,
        type: 'image',
        props: {
          src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
          alt: 'Image',
          width: '100%',
          borderRadius: 8,
        },
      } as ImageBlock;
    case 'button':
      return {
        id,
        type: 'button',
        props: {
          text: 'Нажать',
          url: '#',
          variant: 'filled',
          color: '#ffffff',
          bgColor: '#4f46e5',
          align: 'center',
        },
      } as ButtonBlock;
    case 'columns':
      return {
        id,
        type: 'columns',
        props: {
          columns: [
            { id: uuidv4(), blocks: [] },
            { id: uuidv4(), blocks: [] },
          ],
          gap: 24,
        },
      } as ColumnsBlock;
    case 'form':
      return {
        id,
        type: 'form',
        props: {
          fields: [
            { id: uuidv4(), label: 'Имя', type: 'text', placeholder: 'Ваше имя', required: true },
            { id: uuidv4(), label: 'Email', type: 'email', placeholder: 'email@example.com', required: true },
            { id: uuidv4(), label: 'Сообщение', type: 'textarea', placeholder: 'Ваше сообщение...', required: false },
          ],
          submitText: 'Отправить',
          bgColor: '#f8fafc',
        },
      } as FormBlock;
    case 'spacer':
      return {
        id,
        type: 'spacer',
        props: { height: 48 },
      } as SpacerBlock;
    case 'divider':
      return {
        id,
        type: 'divider',
        props: { color: '#e2e8f0', thickness: 1, width: '100%' },
      } as DividerBlock;
    default:
      throw new Error(`Unknown block type: ${type}`);
  }
}
