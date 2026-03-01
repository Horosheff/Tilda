import type { ButtonBlock } from '../../types';

interface Props {
  block: ButtonBlock;
}

export default function ButtonRenderer({ block }: Props) {
  const { text, url, variant, color, bgColor, align } = block.props;

  const baseStyle = 'inline-block px-8 py-3 rounded-lg font-medium text-base transition-all cursor-pointer';
  const variants: Record<string, string> = {
    filled: '',
    outlined: 'bg-transparent border-2',
    text: 'bg-transparent border-none underline',
  };

  const style: React.CSSProperties = {
    color: variant === 'filled' ? color : bgColor,
    backgroundColor: variant === 'filled' ? bgColor : 'transparent',
    borderColor: variant === 'outlined' ? bgColor : undefined,
  };

  return (
    <div className="py-3" style={{ textAlign: align }}>
      <a href={url} className={`${baseStyle} ${variants[variant]}`} style={style}>
        {text}
      </a>
    </div>
  );
}
