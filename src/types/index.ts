export type BlockType =
  | 'heading'
  | 'text'
  | 'image'
  | 'button'
  | 'columns'
  | 'form'
  | 'spacer'
  | 'divider';

export interface BlockBase {
  id: string;
  type: BlockType;
}

export interface HeadingBlock extends BlockBase {
  type: 'heading';
  props: {
    text: string;
    level: 1 | 2 | 3;
    align: 'left' | 'center' | 'right';
    color: string;
  };
}

export interface TextBlock extends BlockBase {
  type: 'text';
  props: {
    text: string;
    align: 'left' | 'center' | 'right';
    fontSize: number;
    color: string;
  };
}

export interface ImageBlock extends BlockBase {
  type: 'image';
  props: {
    src: string;
    alt: string;
    width: string;
    borderRadius: number;
  };
}

export interface ButtonBlock extends BlockBase {
  type: 'button';
  props: {
    text: string;
    url: string;
    variant: 'filled' | 'outlined' | 'text';
    color: string;
    bgColor: string;
    align: 'left' | 'center' | 'right';
  };
}

export interface ColumnItem {
  id: string;
  blocks: Block[];
}

export interface ColumnsBlock extends BlockBase {
  type: 'columns';
  props: {
    columns: ColumnItem[];
    gap: number;
  };
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'textarea';
  placeholder: string;
  required: boolean;
}

export interface FormBlock extends BlockBase {
  type: 'form';
  props: {
    fields: FormField[];
    submitText: string;
    bgColor: string;
  };
}

export interface SpacerBlock extends BlockBase {
  type: 'spacer';
  props: {
    height: number;
  };
}

export interface DividerBlock extends BlockBase {
  type: 'divider';
  props: {
    color: string;
    thickness: number;
    width: string;
  };
}

export type Block =
  | HeadingBlock
  | TextBlock
  | ImageBlock
  | ButtonBlock
  | ColumnsBlock
  | FormBlock
  | SpacerBlock
  | DividerBlock;

export interface Page {
  id: string;
  title: string;
  blocks: Block[];
  backgroundColor: string;
  maxWidth: number;
}

export interface AIGenerateRequest {
  prompt: string;
  language?: 'ru' | 'en';
}
