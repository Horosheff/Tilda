import type { Block, Page } from '../types';

function renderBlockToHtml(block: Block): string {
  switch (block.type) {
    case 'heading': {
      const { text, level, align, color } = block.props;
      const tag = `h${level}`;
      const sizes: Record<number, string> = {
        1: 'font-size:36px;font-weight:700;',
        2: 'font-size:30px;font-weight:600;',
        3: 'font-size:24px;font-weight:500;',
      };
      return `<${tag} style="${sizes[level]}text-align:${align};color:${color};margin:16px 0;line-height:1.2;">${escapeHtml(text)}</${tag}>`;
    }

    case 'text': {
      const { text, align, fontSize, color } = block.props;
      return `<p style="font-size:${fontSize}px;text-align:${align};color:${color};line-height:1.6;margin:8px 0;white-space:pre-wrap;">${escapeHtml(text)}</p>`;
    }

    case 'image': {
      const { src, alt, width, borderRadius } = block.props;
      return `<div style="padding:8px 0;text-align:center;"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" style="max-width:100%;width:${width};border-radius:${borderRadius}px;height:auto;display:block;margin:0 auto;" loading="lazy" /></div>`;
    }

    case 'button': {
      const { text, url, variant, color, bgColor, align } = block.props;
      let style = `display:inline-block;padding:12px 32px;border-radius:8px;font-size:16px;font-weight:500;text-decoration:none;`;
      if (variant === 'filled') {
        style += `background-color:${bgColor};color:${color};border:none;`;
      } else if (variant === 'outlined') {
        style += `background-color:transparent;color:${bgColor};border:2px solid ${bgColor};`;
      } else {
        style += `background-color:transparent;color:${bgColor};border:none;text-decoration:underline;`;
      }
      return `<div style="text-align:${align};padding:12px 0;"><a href="${escapeHtml(url)}" style="${style}">${escapeHtml(text)}</a></div>`;
    }

    case 'form': {
      const { fields, submitText, bgColor } = block.props;
      const fieldHtml = fields
        .map(
          (f) =>
            `<div style="margin-bottom:16px;"><label style="display:block;font-size:14px;font-weight:500;margin-bottom:4px;color:#374151;">${escapeHtml(f.label)}${f.required ? '<span style="color:#ef4444;margin-left:4px;">*</span>' : ''}</label>${
              f.type === 'textarea'
                ? `<textarea placeholder="${escapeHtml(f.placeholder)}" style="width:100%;padding:8px 16px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;min-height:80px;resize:vertical;box-sizing:border-box;"${f.required ? ' required' : ''}></textarea>`
                : `<input type="${f.type}" placeholder="${escapeHtml(f.placeholder)}" style="width:100%;padding:8px 16px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box;"${f.required ? ' required' : ''} />`
            }</div>`
        )
        .join('\n');
      return `<div style="background-color:${bgColor};padding:24px;border-radius:12px;margin:8px 0;"><form style="max-width:448px;margin:0 auto;">${fieldHtml}<button type="submit" style="width:100%;padding:12px;background-color:#4f46e5;color:white;font-size:16px;font-weight:500;border:none;border-radius:8px;cursor:pointer;">${escapeHtml(submitText)}</button></form></div>`;
    }

    case 'spacer':
      return `<div style="height:${block.props.height}px;"></div>`;

    case 'divider': {
      const { color, thickness, width } = block.props;
      return `<div style="display:flex;justify-content:center;padding:16px 0;"><hr style="border:none;border-top:${thickness}px solid ${color};width:${width};margin:0;" /></div>`;
    }

    case 'columns': {
      const { columns, gap } = block.props;
      const colHtml = columns
        .map(
          (col) =>
            `<div style="flex:1;min-width:0;">${col.blocks.map(renderBlockToHtml).join('\n')}</div>`
        )
        .join('\n');
      return `<div style="display:flex;gap:${gap}px;padding:8px 0;">${colHtml}</div>`;
    }

    default:
      return '';
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function exportToHtml(page: Page): string {
  const blocksHtml = page.blocks.map(renderBlockToHtml).join('\n');

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(page.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: ${page.backgroundColor};
      -webkit-font-smoothing: antialiased;
    }
    .page-container {
      max-width: ${page.maxWidth}px;
      margin: 0 auto;
      padding: 32px 24px;
    }
  </style>
</head>
<body>
  <div class="page-container">
${blocksHtml}
  </div>
</body>
</html>`;
}

export function downloadHtml(page: Page) {
  const html = exportToHtml(page);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${page.title.replace(/\s+/g, '-').toLowerCase()}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToJson(page: Page): string {
  return JSON.stringify(page, null, 2);
}

export function downloadJson(page: Page) {
  const json = exportToJson(page);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${page.title.replace(/\s+/g, '-').toLowerCase()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
