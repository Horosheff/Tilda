import type { SpacerBlock } from '../../types';

interface Props {
  block: SpacerBlock;
}

export default function SpacerRenderer({ block }: Props) {
  return <div style={{ height: `${block.props.height}px` }} />;
}
