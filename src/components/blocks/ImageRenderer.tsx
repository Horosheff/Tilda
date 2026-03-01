import type { ImageBlock } from '../../types';

interface Props {
  block: ImageBlock;
}

export default function ImageRenderer({ block }: Props) {
  const { src, alt, width, borderRadius } = block.props;

  return (
    <div className="py-2">
      <img
        src={src}
        alt={alt}
        style={{ width, borderRadius: `${borderRadius}px` }}
        className="max-w-full h-auto object-cover mx-auto block"
        loading="lazy"
      />
    </div>
  );
}
