import {
  callGemini,
  extractHtmlText,
  makeAgentBlockPrompt,
  sanitizeBlockRootVisualEffects,
  validateBlockHtml,
  generateImagenImage,
  callGeminiStream,
} from '../shared/aiRuntime';
import type { AnimationOptions, BlockPlan, DesignSystem } from '../shared/aiRuntime';

export interface BlockWorkerInput {
  designSystem: DesignSystem;
  block: BlockPlan;
  blockIndex: number;
  totalBlocks: number;
  animOptions?: AnimationOptions;
  allBlocks?: BlockPlan[];
  refinementInstruction?: string;
  model: string;
}

export async function runBlockWorker(
  apiKey: string,
  input: BlockWorkerInput,
  onStreamChunk?: (chunk: string) => void
): Promise<string> {
  const prompt = makeAgentBlockPrompt(
    input.designSystem,
    input.block,
    input.blockIndex,
    input.totalBlocks,
    input.animOptions,
    input.allBlocks
  );

  const raw = await callGeminiStream(
    apiKey,
    prompt,
    (chunk) => {
      if (onStreamChunk) onStreamChunk(chunk);
    },
    {
      temperature: 0.35,
      maxOutputTokens: 60000,
      model: input.model,
    }
  );

  let html = sanitizeBlockRootVisualEffects(extractHtmlText(raw));

  // ─── Self-Review Agent Phase ───
  const qaPrompt = `You are a strict QA engineer reviewing an HTML block for a premium landing page.
You must check the structural and visual quality of the provided HTML.
Look specifically for:
1. Placeholder text ("Lorem ipsum", "Text here") that should be replaced with real, context-appropriate copy.
2. Empty or dead links (href="#" or href="") in buttons/anchors that should ideally have a real URL or smooth scroll anchor.
3. Unclosed HTML tags or broken structure.
4. Severe color contrast issues (e.g., white text on a very light background) based on inline styles.
5. Incomplete implementation of requested features from the block plan.
6. Make sure all images use \`https://image.pollinations.ai/prompt/...\` URLs. If you see picsum.photos, flag it as an error.
7. Missing mobile responsiveness: Check the CSS for @media queries. If there are NO @media rules adjusting the layout for mobile (like max-width: 768px), it's a severe error. The layout MUST gracefully degrade on small screens.

If the HTML is completely fine and production-ready, reply with EXACTLY the word 'OK' and absolutely nothing else.
If there are issues, list them briefly and clearly as bullet points.

HTML TO REVIEW:
\`\`\`html
${html}
\`\`\``;

  try {
    const qaResult = await callGemini(apiKey, qaPrompt, {
      temperature: 0.1, // Low temp for analytical QA
      maxOutputTokens: 2000,
      model: input.model,
    });

    const qaText = qaResult.trim();
    if (qaText.toUpperCase() !== 'OK' && qaText.length > 5) {
      console.log(`[Self-Review] Обнаружены проблемы в блоке ${input.blockIndex + 1}:\n${qaText}`);

      const fixPrompt = `You are an expert HTML/CSS developer.
You generated the following HTML block, but the QA engineer found issues with it.

ISSUES FOUND:
${qaText}

ORIGINAL HTML:
\`\`\`html
${html}
\`\`\`

TASK:
Fix ALL the issues listed by the QA engineer. 
Return the COMPLETE, FIXED HTML code.
Return ONLY valid HTML code. Do NOT include markdown formatting or explanations.`;

      const fixRaw = await callGeminiStream(
        apiKey,
        fixPrompt,
        (chunk) => {
          if (onStreamChunk) onStreamChunk(chunk); // Stream the fix too!
        },
        {
          temperature: 0.2,
          maxOutputTokens: 60000,
          model: input.model,
        }
      );

      html = sanitizeBlockRootVisualEffects(extractHtmlText(fixRaw));
      console.log(`[Self-Review] Блок ${input.blockIndex + 1} успешно исправлен.`);
    } else {
      console.log(`[Self-Review] Блок ${input.blockIndex + 1} идеален (OK).`);
    }
  } catch (err) {
    console.warn(`[Self-Review] Ошибка во время проверки (игнорирую, использую оригинал):`, err);
  }

  // ─── Post-Processing: Imagen 3 Generation ───
  try {
    const imagenRegex = /GEMINI_IMAGEN:\s*([^"'\)]+)/gi;
    const matches = [...html.matchAll(imagenRegex)];
    if (matches.length > 0) {
      console.log(`[Imagen] Найдены ${matches.length} запросов на генерацию изображений в блоке ${input.blockIndex + 1}.`);
      for (const match of matches) {
        const fullPlaceholder = match[0];
        const promptText = match[1].trim();
        try {
          console.log(`[Imagen] Генерирую: "${promptText}"`);
          const base64Url = await generateImagenImage(apiKey, promptText);
          html = html.replace(fullPlaceholder, base64Url);
        } catch (e) {
          console.warn(`[Imagen] Ошибка генерации для "${promptText}", используем fallback Picsum:`, e);
          html = html.replace(fullPlaceholder, 'https://picsum.photos/seed/' + encodeURIComponent(promptText) + '/800/600');
        }
      }
    }
  } catch (err) {
    console.warn(`[Imagen] Ошибка парсинга плейсхолдеров: `, err);
  }

  html = injectGoogleFonts(html, input.designSystem);
  return validateBlockHtml(html);
}

/**
 * Auto-inject Google Fonts <link> tags based on the design system fonts.
 * Parses font families from the design system and adds the appropriate link.
 */
function injectGoogleFonts(html: string, ds: DesignSystem): string {
  const fonts = new Set<string>();

  // Collect font families from the design system
  const candidates = [
    ds.fontFamily,
    ds.headingFontFamily,
    ds.bodyFontFamily,
  ].filter(Boolean);

  for (const raw of candidates) {
    if (!raw) continue;
    // Extract first font name (before comma), strip quotes
    const fontName = raw.split(',')[0].replace(/["']/g, '').trim();
    // Skip system/generic fonts
    if (/^(system-ui|sans-serif|serif|monospace|cursive|fantasy|inherit|initial|unset|Arial|Helvetica|Times|Courier|Georgia|Verdana|Tahoma|Trebuchet)/i.test(fontName)) continue;
    if (fontName.length > 1) fonts.add(fontName);
  }

  if (fonts.size === 0) return html;

  const familyParam = [...fonts].map(f => `family=${f.replace(/\s+/g, '+')}:wght@400;500;600;700;800;900`).join('&');
  const link = `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?${familyParam}&display=swap" rel="stylesheet">`;

  // Prepend before the HTML content
  return link + '\n' + html;
}
