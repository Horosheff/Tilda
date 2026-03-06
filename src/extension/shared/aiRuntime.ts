export interface DesignSystem {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgLight: string;
  bgDark: string;
  textColor: string;
  textMuted: string;
  fontFamily: string;
  headingFontFamily?: string;
  bodyFontFamily?: string;
  typographyPairName?: string;
  headingStyle: string;
  buttonStyle: string;
  borderRadius: string;
  sectionPadding: string;
  artDirection?: string;
  compositionStyle?: string;
  surfaceStyle?: string;
  visualMotif?: string;
  shadowStyle?: string;
  seoStrategy?: string;
  answerEngineStyle?: string;
  entityFocus?: string;
  trustSignals?: string;
}

export interface BlockPlan {
  type: string;
  description: string;
}

export interface AnimationOptions {
  staggerReveal?: boolean;
  fadeInUp?: boolean;
  zoomIn?: boolean;
  cardLift?: boolean;
  glowHover?: boolean;
  tiltHover?: boolean;
  textClip?: boolean;
  parallax?: boolean;
  floatSubtle?: boolean;
}

export interface AgentPlan {
  designSystem: DesignSystem;
  blocks: BlockPlan[];
}

export interface GeminiCallOptions {
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
  model?: string;
}

export const AGENT_ORCHESTRATOR_PROMPT = `You are an elite landing-page creative director, conversion copywriter, editorial designer, and design-system orchestrator.

Your job: given a user request, create a COMPLETE PREMIUM page plan that feels designed by a top-tier agency, not a generic AI template.

YOU MUST:
1. Build a strong, coherent design system with clear art direction, not just a few random colors.
2. Choose a TYPOGRAPHIC PAIRING that matches the brand tone. Headings and body text should feel intentionally paired.
3. Plan 5-7 sections that flow like a persuasive narrative from top to bottom.
4. WRITE THE ACTUAL COPY IN RUSSIAN FOR EVERY BLOCK when the request is in Russian.
5. Make the layout feel designed: asymmetry, rhythm, contrast, pacing, negative space, hierarchy, and visual motif.
6. Make the page SEO + AEO + GEO optimized for 2026 search behavior, including classic search, AI overviews, and answer engines.

DESIGN TASTE REQUIREMENTS:
- Avoid default SaaS sameness.
- Avoid bland "hero + 3 cards + CTA" thinking unless the brief explicitly demands something minimal.
- Prefer one strong visual idea per page: editorial luxury, brutal contrast, dark tech precision, premium glass depth, warm human craft, productized enterprise clarity, etc.
- Use composition intentionally: split hero, bento rhythm, layered content, staggered cards, contrast between dense and airy sections, alternating section energy.

TYPOGRAPHY REQUIREMENT:
Choose an appropriate typography pairing that matches the brand tone (e.g., from Google Fonts) and reflect it in the JSON.

2026 SEO / AEO / GEO REQUIREMENTS:
- Think beyond keywords: optimize for entities, questions, topical clarity, and citation-worthiness in AI answers.
- The page should contain answer-first passages that could be quoted by AI systems in 40-80 words.
- Use question-shaped section ideas where appropriate, especially for FAQ, objections, comparisons, implementation steps, or service explanations.
- Build clear E-E-A-T signals into the copy: expertise, proof, specifics, real numbers, clear outcomes, named methods, process clarity, trust indicators.
- Prefer scannable structures: short paragraphs, bullets, numbered logic, definition-style intros, stat rows, comparison fragments, FAQs.
- If the request implies local intent or geo intent, include local relevance naturally: city/service area, local proof, trust details, operating context.
- If the request implies product/category intent, use precise entity naming, category language, and use-case clarity instead of vague slogans.
- Include at least one block that is naturally answer-engine friendly: FAQ, "how it works", "who it is for", or "what problem it solves".

CRITICAL RULE:
Each block "description" MUST contain the REAL TEXT that appears on the page AND the visual/compositional intent of the block.
Do NOT write abstract placeholders like "hero with title" or "features section".
Another agent must be able to render a strong block from your description without guessing.

FOR EACH BLOCK DESCRIPTION, INCLUDE:
- exact headlines, subheadlines, CTA labels, feature names, stats, quotes, etc.
- what the visual hierarchy is
- what kind of composition should be used
- where accents/cards/badges/media should appear
- what should feel dense vs airy
- what SEO/AEO/GEO role this block plays: entity intro, trust proof, answer snippet, FAQ coverage, comparison, process clarity, etc.

FOR EACH BLOCK TYPE:
Plan the necessary elements for the specific block type (e.g., headlines, paragraphs, cards, buttons, media logic) and explicitly describe the visual layout rhythm, hierarchy, and composition. Do not constrain yourself to typical block layouts; invent new layouts when appropriate.

Return ONLY this JSON (no markdown, no code fences, no explanation):
{
  "designSystem": {
    "primaryColor": "#hex",
    "secondaryColor": "#hex",
    "accentColor": "#hex",
    "bgLight": "#hex",
    "bgDark": "#hex",
    "textColor": "#hex",
    "textMuted": "#hex",
    "fontFamily": "[Base Font Family]",
    "headingFontFamily": "[Heading Font Family]",
    "bodyFontFamily": "[Body Font Family]",
    "typographyPairName": "[Typography Pair Name]",
    "headingStyle": "[Heading CSS rules]",
    "buttonStyle": "[Button CSS rules]",
    "borderRadius": "[e.g. 18px]",
    "sectionPadding": "[e.g. 96px 24px]",
    "artDirection": "[Describe art direction]",
    "compositionStyle": "[Describe composition style]",
    "surfaceStyle": "[Describe surface style]",
    "visualMotif": "[Describe visual motif]",
    "shadowStyle": "[Describe shadow style]",
    "seoStrategy": "[Describe SEO strategy]",
    "answerEngineStyle": "[Describe answer engine style]",
    "entityFocus": "[Describe entity focus]",
    "trustSignals": "[Describe trust signals]"
  },
  "blocks": [
    { "type": "[block_type e.g. hero]", "description": "[REAL copy + explicit composition and hierarchy]" },
    { "type": "[block_type e.g. features]", "description": "[REAL copy + explicit composition and hierarchy]" }
  ]
}

Rules:
- Keep the design system cohesive, memorable, and premium.
- Plan 5-7 blocks unless the request strongly suggests fewer.
- The page should feel art-directed, not auto-generated.
- The page should be structured so both search engines and AI answer engines can easily extract, summarize, and cite it.
- For Russian prompts, write everything in Russian.
- Return ONLY the JSON. No explanation.`;

export const AGENT_ORCHESTRATOR_TEMPLATE_ADDON = `

IMPORTANT - REFERENCE TEMPLATE:
The user provided HTML of a reference page below. You MUST:
- Extract the visual style from it: colors (hex), typography feel, likely font pairing, spacing rhythm, button feel, section pacing, density, and mood.
- Extract any SEO/AEO/GEO patterns if present: FAQ logic, answer-first copy, proof sections, semantic clarity, trust sections, local intent cues.
- Put those findings into your designSystem, including typographyPairName, headingFontFamily/bodyFontFamily, artDirection, compositionStyle, surfaceStyle, visualMotif, shadowStyle, seoStrategy, answerEngineStyle, entityFocus, and trustSignals.
- Match the structure thoughtfully: if the reference has hero, feature rhythm, CTA, footer, plan similar momentum while still improving clarity and polish.
- Return ONLY the JSON. No explanation.`;

export const AGENT_ANIM_PLAN_ADDON = `

ANIMATIONS ENABLED:
- We have access to jQuery on the page (Tilda includes it).
- You MAY plan complex interactive effects that require custom JavaScript/jQuery (e.g. mouse move parallax, scroll-trigger class toggles, custom interactive sliders, complex accordion logic).
- Make sure to keep the layout stable and production-friendly.
- Plan sections so motion enhances hierarchy and adds premium interactivity.`;

export function makeAgentBlockPrompt(
  ds: DesignSystem,
  block: BlockPlan,
  blockIndex: number,
  totalBlocks: number,
  animOpts?: AnimationOptions,
  allBlocks?: BlockPlan[],
  refinementInstruction?: string
): string {
  const hasAnim = !!(
    animOpts &&
    (animOpts.staggerReveal ||
      animOpts.fadeInUp ||
      animOpts.zoomIn ||
      animOpts.cardLift ||
      animOpts.glowHover ||
      animOpts.tiltHover ||
      animOpts.textClip ||
      animOpts.parallax ||
      animOpts.floatSubtle)
  );

  const parts: string[] = [];
  if (animOpts?.staggerReveal) parts.push('Structure content in multiple cards or rows so stagger reveal has meaningful targets.');
  if (animOpts?.fadeInUp) parts.push('Use clear vertical rhythm and revealable sections.');
  if (animOpts?.zoomIn) parts.push('Use cards or media areas that can scale in gracefully.');
  if (animOpts?.cardLift) parts.push('Prefer card-based layout with strong hover affordance.');
  if (animOpts?.glowHover) parts.push('Include CTA buttons or accent cards suitable for hover glow.');
  if (animOpts?.tiltHover) parts.push('Use a few featured cards or media panels suitable for subtle tilt.');
  if (animOpts?.textClip) parts.push('Include clear H1/H2/H3 headings for title reveals.');
  if (animOpts?.parallax) parts.push('Leave room for layered background or decorative depth.');
  if (animOpts?.floatSubtle) parts.push('Add small accent shapes or badges that can float subtly.');

  const animSection = hasAnim && parts.length > 0
    ? `\n\nANIMATION HINTS: ${parts.join(' | ')}`
    : '';

  const refinementSection = refinementInstruction
    ? `\n\n=== ✏ УКАЗАНИЯ ДЛЯ ДОРАБОТКИ БЛОКА ===\nПОЛЬЗОВАТЕЛЬ ПОПРОСИЛ КОНКРЕТНО ИЗМЕНИТЬ ИМЕННО ЭТОТ БЛОК:\n"${refinementInstruction}"\nУбедись, что это требование выполнено в первую очередь!\n=============================================\n`
    : '';

  return `You are a professional HTML/CSS developer building a Tilda landing page block.${refinementSection}

DESIGN SYSTEM (you MUST follow this exactly):
- Primary: ${ds.primaryColor}
- Secondary: ${ds.secondaryColor}
- Accent: ${ds.accentColor}
- Background light: ${ds.bgLight}
- Background dark: ${ds.bgDark}
- Text: ${ds.textColor}
- Muted text: ${ds.textMuted}
- Base font: ${ds.fontFamily}
- Heading font: ${ds.headingFontFamily || ds.fontFamily}
- Body font: ${ds.bodyFontFamily || ds.fontFamily}
- Typography pair: ${ds.typographyPairName || 'Custom pair'}
- Heading style: ${ds.headingStyle}
- Button style: ${ds.buttonStyle}
- Border radius: ${ds.borderRadius}
- Section padding: ${ds.sectionPadding}
- Art direction: ${ds.artDirection || 'Premium modern digital product'}
- Composition style: ${ds.compositionStyle || 'Balanced modern layout with clear hierarchy'}
- Surface style: ${ds.surfaceStyle || 'Clean surfaces with controlled depth'}
- Visual motif: ${ds.visualMotif || 'Accent chips, cards, and subtle separators'}
- Shadow style: ${ds.shadowStyle || 'Local depth only on inner elements'}
- SEO strategy: ${ds.seoStrategy || 'Intent-aligned, entity-rich, answer-first content'}
- Answer engine style: ${ds.answerEngineStyle || 'Quotable concise explanations and scannable structure'}
- Entity focus: ${ds.entityFocus || 'Category, audience, use cases, and differentiators'}
- Trust signals: ${ds.trustSignals || 'Specific proof, process, and credibility details'}

BLOCK TO GENERATE:
Type: ${block.type} (section ${blockIndex + 1} of ${totalBlocks})
Content to use EXACTLY on the page:
${block.description}

BLOCK CONTEXT (adjacent blocks for awareness — do NOT duplicate their content, ONLY care about visual flow):
${blockIndex > 0 && allBlocks ? `- PREVIOUS block (${blockIndex}/${totalBlocks}): "${allBlocks[blockIndex - 1].type}" — ${allBlocks[blockIndex - 1].description.slice(0, 150)}...` : '- This is the FIRST block on the page.'}
${blockIndex < totalBlocks - 1 && allBlocks ? `- NEXT block (${blockIndex + 2}/${totalBlocks}): "${allBlocks[blockIndex + 1].type}" — ${allBlocks[blockIndex + 1].description.slice(0, 150)}...` : '- This is the LAST block on the page.'}
IMPORTANT: Alternate background colors with adjacent blocks. If the previous block likely uses a dark bg, use a light bg, and vice versa. Avoid two dark or two light sections in a row.
${animSection}

HARD RULES:
1. Return ONLY one html code block or raw HTML. No explanations.
2. DO NOT include <!DOCTYPE>, <html>, <head>, <body>, <meta>, or <title> tags. Output ONLY the wrapper <section> or <div> and its contents.
3. DO NOT use Base64 encoded images in CSS or HTML. They cause token truncation and will break the output.
4. For images, MUST use the pseudo-protocol: \`src="GEMINI_IMAGEN: {detailed english prompt describing the image}"\`.
   - Example 1: \`<img src="GEMINI_IMAGEN: realistic luxury coffee cup sitting on a dark wooden table cinematic lighting" alt="..." />\`
   - Example 2: \`url("GEMINI_IMAGEN: elegant abstract 3d shapes floating over dark background")\`
   - NEVER use picsum.photos or pollinations.ai. MAKE the prompt highly detailed and relevant to the block content.
5. All HTML tags MUST be properly closed.
5. Use ONLY inline CSS or a single <style> block at the top. You MAY include a single <script> block at the bottom using jQuery for interactive effects.
6. The section MUST contain the text from the content above. Do not replace it with generic filler.
7. Make text readable with strong contrast.
8. Wrap everything in a single <section> or <div> root for this block.
9. Use max-width: 1200px; margin: 0 auto; padding: 0 20px; for the inner container.
10. Make it responsive with flexbox or CSS grid AND generic CSS @media queries (e.g. @media (max-width: 768px)) to adjust padding, font-sizes, and flex-directions (e.g. flex-direction: column) for mobile devices. A block is NOT valid without mobile responsiveness.
11. NEVER put big box-shadow, outer glow, filter, or neon halo on the ROOT block wrapper itself.
10. Visual depth must happen INSIDE the block: cards, CTA buttons, media panels, badges, or inner surfaces.
11. The root section background can have color or gradient, but it must sit cleanly on the page without looking like one huge glowing card dropped under the section.
12. Use the typography pair intentionally: headings must feel distinct from body text.
13. Avoid generic symmetric card rows unless the block description explicitly calls for them.
14. Build one memorable composition idea per block: asymmetry, editorial split, bento rhythm, layered contrast, staggered hierarchy, anchored CTA zone, or striking stat composition.
15. Use semantic HTML where appropriate: section, header, article, nav, ul/ol, h1-h3, button, blockquote, footer.
16. Preserve clean heading hierarchy for search: page hero gets the H1, subsequent section titles should be H2/H3.
17. Write concrete, entity-rich copy that clearly states what the product/service is, who it is for, what problem it solves, and why it is credible.
18. Include at least one short answer-first passage or definition-like paragraph that AI systems could quote directly.
19. When relevant, structure content into scannable bullets, stat rows, FAQs, steps, or comparisons.
20. If the block is FAQ or How It Works oriented, you MAY include compact JSON-LD schema in a <script type="application/ld+json"> block only when it clearly matches the content.

QUALITY:
- Premium and modern, not bootstrap-default.
- The block should feel like a designer made a deliberate concept choice, not like a default component dump.
- Add subtle hover transitions on buttons/cards.
- Use shadows, border radius, gradients, and decorative accents with restraint and intention.
- Create strong visual hierarchy through scale, spacing, typography contrast, and composition.
- Use negative space strategically so dense sections feel premium instead of cluttered.
- Prefer beautiful internal structure over giant wrapper effects.
- Prioritize factual clarity, answerability, and citation-worthiness over vague marketing fluff.
- Use specific claims, explainers, process details, and trust cues instead of empty superlatives.
- Avoid giant glowing frames around the whole section.
- The block must feel cohesive with the design system.
- If animations are complex, write a concise <script> block at the end using $(document).ready() to add scroll-listeners, mouse-move parallax, or hover logic. Prefix your script classes/ids carefully so they do not conflict.`;
}

export function stripModelNoise(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^\s*```[a-z]*\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

export function extractJsonText(raw: string): string {
  const trimmed = stripModelNoise(raw);
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced) return fenced[1].trim();

  const firstBrace = trimmed.indexOf('{');
  if (firstBrace === -1) return trimmed;

  let inString = false;
  let escaped = false;
  let depth = 0;

  for (let i = firstBrace; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) return trimmed.slice(firstBrace, i + 1).trim();
    }
  }

  return trimmed;
}

/**
 * Strip full-document wrappers that AI sometimes generates despite instructions.
 * Extracts only the content inside <body>...</body>, removing <!DOCTYPE>, <html>,
 * <head>, <meta>, <title>, and <body> wrapper tags.
 */
function stripDocumentWrapper(html: string): string {
  let result = html;

  // Remove <!DOCTYPE ...>
  result = result.replace(/<!DOCTYPE[^>]*>/gi, '');

  // If there's a <body>...</body>, extract only its contents
  const bodyMatch = result.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    result = bodyMatch[1];
  } else {
    // No <body> tag, but still remove <html>, <head>...</head>, standalone <meta>, <title>
    result = result.replace(/<html[^>]*>/gi, '');
    result = result.replace(/<\/html>/gi, '');
    result = result.replace(/<head[\s\S]*?<\/head>/gi, '');
    result = result.replace(/<meta[^>]*\/?>/gi, '');
    result = result.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '');
  }

  // Remove any remaining <body> or </body> tags (in case of malformed HTML)
  result = result.replace(/<\/?body[^>]*>/gi, '');

  return result.trim();
}

/**
 * Validate that an HTML block is valid and not empty/garbage.
 * Returns the HTML if valid, or throws an error with details.
 */
export function validateBlockHtml(html: string, minLength = 200): string {
  const trimmed = html.trim();

  if (!trimmed) {
    throw new Error('AI вернул пустой HTML-блок');
  }

  if (trimmed.length < minLength) {
    throw new Error(`AI вернул слишком короткий блок (${trimmed.length} символов, минимум ${minLength}). Содержимое: ${trimmed.slice(0, 100)}...`);
  }

  // Check for empty <style></style> only blocks
  const withoutStyleTags = trimmed.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').trim();
  const withoutScriptTags = withoutStyleTags.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').trim();
  if (withoutScriptTags.length < 50) {
    throw new Error('AI вернул блок, содержащий только <style>/<script> без реального контента');
  }

  return trimmed;
}

export function extractHtmlText(raw: string): string {
  const trimmed = stripModelNoise(raw);
  let html: string;

  const matches = [...trimmed.matchAll(/```[a-z]*\s*([\s\S]*?)\s*```/gi)];
  if (matches.length > 0) {
    html = matches.map((m) => m[1].trim()).join('\n\n');
  } else {
    const firstAngle = trimmed.indexOf('<');
    const lastAngle = trimmed.lastIndexOf('>');
    if (firstAngle !== -1 && lastAngle !== -1 && lastAngle > firstAngle) {
      html = trimmed.slice(firstAngle, lastAngle + 1).trim();
    } else {
      html = trimmed;
    }
  }

  // Always strip document wrappers in case AI generated a full HTML document
  return stripDocumentWrapper(html);
}

function stripVisualEffectsFromStyle(styleValue: string): string {
  return styleValue
    .replace(/(?:^|;)\s*box-shadow\s*:[^;]*;?/gi, ';')
    .replace(/(?:^|;)\s*filter\s*:[^;]*;?/gi, ';')
    .replace(/(?:^|;)\s*backdrop-filter\s*:[^;]*;?/gi, ';')
    .replace(/(?:^|;)\s*transition\s*:[^;]*box-shadow[^;]*;?/gi, ';')
    .replace(/;;+/g, ';')
    .replace(/^\s*;\s*|\s*;\s*$/g, '')
    .trim();
}

export function sanitizeBlockRootVisualEffects(html: string): string {
  const rootWithStyle = html.match(/^<([a-z0-9-]+)\b([^>]*?)\sstyle=(["'])([\s\S]*?)\3([^>]*)>/i);
  if (!rootWithStyle) return html;

  const [fullMatch, tagName, beforeStyle, quote, styleValue, afterStyle] = rootWithStyle;
  const cleanedStyle = stripVisualEffectsFromStyle(styleValue);
  const rebuiltStyleAttr = cleanedStyle ? ` style=${quote}${cleanedStyle}${quote}` : '';
  const rebuiltTag = `<${tagName}${beforeStyle}${rebuiltStyleAttr}${afterStyle}>`;

  return rebuiltTag + html.slice(fullMatch.length);
}

export async function callGemini(
  apiKey: string,
  prompt: string,
  options: GeminiCallOptions = {}
): Promise<string> {
  const model = options.model || 'gemini-2.5-pro';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: options.systemPrompt ? { parts: [{ text: options.systemPrompt }] } : undefined,
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.5,
          maxOutputTokens: options.maxOutputTokens ?? 60000,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API (${response.status}): ${err}`);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  const finishReason = candidate?.finishReason;

  // Detect blocked/filtered responses
  if (finishReason === 'SAFETY') {
    throw new Error('Gemini заблокировал ответ из-за фильтра безопасности. Попробуйте переформулировать промпт.');
  }
  if (finishReason === 'RECITATION') {
    throw new Error('Gemini отклонил ответ из-за совпадения с защищённым контентом.');
  }

  const modelParts = candidate?.content?.parts;
  if (!Array.isArray(modelParts) || modelParts.length === 0) {
    throw new Error('Пустой ответ от Gemini');
  }

  const text = modelParts
    .filter((part: { text?: string }) => typeof part.text === 'string' && part.text.length > 0)
    .map((part: { text: string }) => part.text)
    .join('');

  // Detect truncated output
  if (finishReason === 'MAX_TOKENS') {
    console.warn('[Tilda Space AI] ⚠ Ответ обрезан (MAX_TOKENS). Длина:', text.length);
    // Still return the text — validateBlockHtml will catch if it's too short
    // But mark it so callers can detect truncation
    (globalThis as Record<string, unknown>).__lastGeminiTruncated = true;
  } else {
    (globalThis as Record<string, unknown>).__lastGeminiTruncated = false;
  }

  return text;
}

/**
 * Generates an image using Gemini's native API.
 * Uses `gemini-3.1-flash-image-preview` for generating a 1024x1024 jpeg image.
 * Returns the data URI representation.
 */
export async function generateImagenImage(apiKey: string, prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:predict?key=${apiKey}`;

  const payload = {
    instances: [
      { prompt }
    ],
    parameters: {
      sampleCount: 1,
      aspectRatio: "1:1",
      outputOptions: {
        mimeType: "image/jpeg"
      }
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Imagen generation error:`, text);
    throw new Error(`Imagen generation failed: ${response.status}`);
  }

  const data = await response.json();
  const predictions = data.predictions;

  if (!predictions || predictions.length === 0 || !predictions[0].bytesBase64Encoded) {
    throw new Error('No image data returned from Imagen API.');
  }

  return `data:image/jpeg;base64,${predictions[0].bytesBase64Encoded}`;
}

export async function callGeminiStream(
  apiKey: string,
  prompt: string,
  onChunk: (text: string) => void,
  options: GeminiCallOptions = {}
): Promise<string> {
  const model = options.model || 'gemini-2.5-pro';

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: options.systemPrompt ? { parts: [{ text: options.systemPrompt }] } : undefined,
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.5,
          maxOutputTokens: options.maxOutputTokens ?? 60000,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API Stream (${response.status}): ${err}`);
  }

  if (!response.body) {
    throw new Error('No response body from Gemini API Stream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process SSE lines
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep the last incomplete line in the buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6).trim();
        if (!dataStr) continue;

        try {
          const data = JSON.parse(dataStr);
          const candidate = data?.candidates?.[0];

          if (candidate?.finishReason === 'SAFETY') {
            throw new Error('Gemini заблокировал ответ из-за фильтра безопасности.');
          }
          if (candidate?.finishReason === 'RECITATION') {
            throw new Error('Gemini отклонил ответ из-за совпадения с защищённым контентом.');
          }

          const parts = candidate?.content?.parts;
          if (Array.isArray(parts) && parts.length > 0 && typeof parts[0].text === 'string') {
            const chunkText = parts[0].text;
            fullText += chunkText;
            onChunk(chunkText);
          }
        } catch (e) {
          // Ignore parse errors for incomplete JSON or unknown structures
        }
      }
    }
  }

  return fullText;
}
