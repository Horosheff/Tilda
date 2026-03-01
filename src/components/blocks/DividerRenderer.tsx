import type { DividerBlock } from '../../types';

interface Props {
  block: DividerBlock;
}

export default function DividerRenderer({ block }: Props) {
  const { color, thickness, width } = block.props;

  return (
    <div className="py-4 flex justify-center">
      <hr
        style={{
          borderColor: color,
          borderTopWidth: `${thickness}px`,
          width,
          borderStyle: 'solid',
        }}
        className="border-0 border-t"
      />
    </div>
  );
}
