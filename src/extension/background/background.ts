// ─── Design System Types ───

interface DesignSystem {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgLight: string;
  bgDark: string;
  textColor: string;
  textMuted: string;
  fontFamily: string;
  headingStyle: string;
  buttonStyle: string;
  borderRadius: string;
  sectionPadding: string;
}

interface BlockPlan {
  type: string;
  description: string;
}

interface AnimationOptions {
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

interface AgentPlan {
  designSystem: DesignSystem;
  blocks: BlockPlan[];
}

// ─── System Prompts ───

const ORCHESTRATOR_PROMPT = `You are a CREATIVE web design orchestrator. A visionary designer who creates pages people WANT to revisit. Your MAIN GOAL: every page must cause a "WOW" effect. You do NOT tolerate generic, bland, or template-like design — boring pages are unacceptable.

Identity: You are an award-level creative director. You think in concepts, not in generic blocks. Each page is an experience: memorable, distinctive, emotionally resonant. You borrow inspiration from the best: Stripe, Linear, Vercel, Awwwards — but never copy. You invent.

Given a user request, you must:

1. Create a BOLD, COHESIVE DESIGN SYSTEM — colors that feel fresh (not default blue/gray), typography with character, spacing that breathes. Surprise the eye.
2. Plan the page as a JOURNEY — blocks that flow, each with a clear role. No filler. Every section earns its place and delivers impact.

Return a JSON object with this EXACT structure (no markdown, no code fences):
{
  "designSystem": {
    "primaryColor": "#hex",
    "secondaryColor": "#hex",
    "accentColor": "#hex",
    "bgLight": "#hex (light background for alternating sections)",
    "bgDark": "#hex (dark background for hero/CTA)",
    "textColor": "#hex (main text)",
    "textMuted": "#hex (secondary text)",
    "fontFamily": "'Inter', system-ui, -apple-system, sans-serif",
    "headingStyle": "font-weight: 800; letter-spacing: -0.02em;",
    "buttonStyle": "padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px;",
    "borderRadius": "16px",
    "sectionPadding": "100px 20px"
  },
  "blocks": [
    { "type": "hero", "description": "..." },
    { "type": "features", "description": "..." },
    { "type": "about", "description": "..." },
    { "type": "testimonials", "description": "..." },
    { "type": "cta", "description": "..." },
    { "type": "footer", "description": "..." }
  ]
}

Rules:
- Color palette: COHESIVE but BOLD. Avoid predictable combos (blue+white, gray gradients). Dare: earthy with electric accent, dark with neon pop, warm minimal with one punch color. Premium ≠ boring.
- Typography: give it personality. Consider distinctive pairings (display + clean body). Headings must command attention.
- Plan 4-7 blocks. Each block description: vivid, specific — "hero with asymmetric layout, large typography, subtle gradient mesh" not "hero with title and button".
- Every block must have a clear visual hook: asymmetry, unexpected layout, micro-interaction opportunity, layered depth.
- For Russian prompts, write descriptions in Russian.
- If the request is vague, interpret CREATIVELY. Surprise the user with a direction they didn't explicitly ask for but will love.
- Return ONLY the JSON. No explanation.`;

function makeBlockPrompt(ds: DesignSystem, block: BlockPlan, blockIndex: number, totalBlocks: number, animOpts?: AnimationOptions): string {
  const hasAnim = animOpts && (animOpts.staggerReveal || animOpts.fadeInUp || animOpts.zoomIn || animOpts.cardLift || animOpts.glowHover || animOpts.tiltHover || animOpts.textClip || animOpts.parallax || animOpts.floatSubtle);
  const parts: string[] = [];
  if (animOpts?.staggerReveal) parts.push('STAGGER REVEAL: Split into 4-8 distinct sections per div. Features, pricing, testimonials.');
  if (animOpts?.fadeInUp) parts.push('FADE IN UP: Smooth upward reveal on scroll.');
  if (animOpts?.zoomIn) parts.push('ZOOM IN: Scale-in reveal from 92% to 100% on scroll.');
  if (animOpts?.cardLift) parts.push('CARD LIFT: Card layout (rounded, padding). Will lift+shadow on hover.');
  if (animOpts?.glowHover) parts.push('GLOW: Add buttons/cards that glow on hover.');
  if (animOpts?.tiltHover) parts.push('TILT HOVER: Cards/containers with subtle 3D tilt on hover.');
  if (animOpts?.textClip) parts.push('TEXT CLIP: Clear h1/h2/h3 headings for left-to-right reveal.');
  if (animOpts?.parallax) parts.push('PARALLAX: Layered sections, bg+foreground for depth.');
  if (animOpts?.floatSubtle) parts.push('FLOAT: Subtle vertical bob for accent elements.');
  const animSection = hasAnim && parts.length > 0
    ? `\n\nANIMATIONS: ${parts.join(' | ')} — Choose the COOLEST combo for this block. Maximize impact.`
    : '';

  return `You are a CREATIVE block-level web designer. Your goal: make block ${blockIndex + 1} of ${totalBlocks} MEMORABLE — something that causes a "wow". No generic layouts, no boring centered boxes. You deliver distinctive, premium design that people want to revisit.

DESIGN SYSTEM (you MUST follow this exactly):
- Primary: ${ds.primaryColor}
- Secondary: ${ds.secondaryColor}  
- Accent: ${ds.accentColor}
- Light bg: ${ds.bgLight}
- Dark bg: ${ds.bgDark}
- Text: ${ds.textColor}
- Muted text: ${ds.textMuted}
- Font: ${ds.fontFamily}
- Headings: ${ds.headingStyle}
- Buttons: ${ds.buttonStyle}
- Border radius: ${ds.borderRadius}
- Section padding: ${ds.sectionPadding}

BLOCK TO GENERATE:
Type: ${block.type}
Description: ${block.description}
${animSection}

RULES:
- Return ONLY raw HTML. No markdown, no code fences, no explanation.
- CRITICAL: All tags MUST be properly closed (every <div> has </div>, <p> has </p>, etc.). Tilda rejects invalid HTML.
- Use INLINE CSS for ALL styles. No <style> tags, no classes.
- Use the EXACT colors and styles from the design system above.
- Wrap in a single <div> with full-width.
- Make it responsive (max-width, %, flexbox, clamp()).
- Use real Unsplash URLs for images: https://images.unsplash.com/photo-{id}?w=800&q=80
- Content in Russian if the description is in Russian.
- This block must look like it belongs to a cohesive, premium page.
- CREATIVE EDGE: Avoid generic centered layouts. Use asymmetry, grid breaks, unexpected spacing, layered depth. Every block should have at least one visual "hook" that makes it memorable.
- SVG: Use inline <svg> with REAL SVG animations (<animate>, <animateTransform>, <animateMotion>). Icons: animated SVG, not emoji. Hero/decor: large animated SVGs — moving shapes, morphing, flowing gradients. Colors: pick to match design system. Premium, animated visuals.`;
}

// ─── API Call Helper ───

async function callGemini(apiKey: string, prompt: string, systemPrompt?: string): Promise<string> {
  const parts = [];
  if (systemPrompt) parts.push({ text: systemPrompt });
  parts.push({ text: prompt });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 8192,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API (${response.status}): ${err}`);
  }

  const data = await response.json();
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return text.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/i, '').trim();
}

// ─── Message Handlers ───

interface Message {
  type: string;
  prompt?: string;
}

chrome.runtime.onMessage.addListener(
  (message: Message, _sender: chrome.runtime.MessageSender, sendResponse: (r: Record<string, unknown>) => void) => {

    if (message.type === 'GENERATE_HTML') {
      handleSingleBlock(message.prompt || '')
        .then((html) => sendResponse({ success: true, html }))
        .catch((err: Error) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    if (message.type === 'AGENT_PLAN') {
      const msg = message as Message & { templateHtml?: string; animOptions?: AnimationOptions };
      handleAgentPlan(message.prompt || '', msg.templateHtml, msg.animOptions)
        .then((plan) => sendResponse({ success: true, plan }))
        .catch((err: Error) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    if (message.type === 'AGENT_BLOCK') {
      const msg = message as Message & { designSystem: DesignSystem; block: BlockPlan; blockIndex: number; totalBlocks: number; animOptions?: AnimationOptions };
      handleAgentBlock(msg.designSystem, msg.block, msg.blockIndex, msg.totalBlocks, msg.animOptions)
        .then((html) => sendResponse({ success: true, html }))
        .catch((err: Error) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    if (message.type === 'GENERATE_SVG_ICON') {
      const msg = message as Message & { prompt: string; size?: number };
      handleGenerateSvgIcon(msg.prompt || '', msg.size || 48)
        .then((svg) => sendResponse({ success: true, svg }))
        .catch((err: Error) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    if (message.type === 'GENERATE_SVG_ANIMATION') {
      const msg = message as Message & { prompt: string };
      handleGenerateSvgAnimation(msg.prompt || '')
        .then((svg) => sendResponse({ success: true, svg }))
        .catch((err: Error) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    if (message.type === 'GET_API_KEY') {
      chrome.storage.local.get(['geminiApiKey'], (result: Record<string, string>) => {
        sendResponse({ apiKey: result.geminiApiKey || null });
      });
      return true;
    }

    if (message.type === 'OPEN_POPUP') {
      chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
      sendResponse({ success: true });
      return true;
    }

    const runCdpSequence = (tabId: number, cmds: Array<{ method: string; params: Record<string, unknown> }>, done: () => void) => {
      let i = 0;
      const run = () => {
        if (i >= cmds.length) {
          chrome.debugger.detach({ tabId }, () => { });
          done();
          return;
        }
        const [method, params] = [cmds[i].method, cmds[i].params];
        chrome.debugger.sendCommand({ tabId }, method, params, () => {
          i++;
          setTimeout(run, 60);
        });
      };
      chrome.debugger.attach({ tabId }, '1.3', () => {
        if (chrome.runtime.lastError) run();
        else run();
      });
    };

    if (message.type === 'MOVE_MOUSE') {
      const { x, y } = message as Message & { x: number; y: number };
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) { sendResponse({ ok: false }); return; }
        const tabId = tabs[0].id;
        const xi = Math.round(x); const yi = Math.round(y);
        runCdpSequence(tabId, [
          { method: 'Input.dispatchMouseEvent', params: { type: 'mouseMoved', x: xi, y: yi, modifiers: 0, button: 'none', buttons: 0, clickCount: 0 } },
        ], () => sendResponse({ ok: true }));
      });
      return true;
    }

    if (message.type === 'CDP_CLICK') {
      const { x, y } = message as Message & { x: number; y: number };
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) { sendResponse({ ok: false }); return; }
        const tabId = tabs[0].id!;
        const xi = Math.round(x); const yi = Math.round(y);
        runCdpSequence(tabId, [
          { method: 'Input.dispatchMouseEvent', params: { type: 'mouseMoved', x: xi, y: yi, modifiers: 0, button: 'none', buttons: 0, clickCount: 0 } },
          { method: 'Input.dispatchMouseEvent', params: { type: 'mousePressed', x: xi, y: yi, modifiers: 0, button: 'left', buttons: 1, clickCount: 1 } },
          { method: 'Input.dispatchMouseEvent', params: { type: 'mouseReleased', x: xi, y: yi, modifiers: 0, button: 'left', buttons: 0, clickCount: 1 } },
        ], () => sendResponse({ ok: true }));
      });
      return true;
    }

    if (message.type === 'ACE_INJECT') {
      const html = (message as Message & { html: string }).html;
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]?.id) { sendResponse({ ok: false }); return; }
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id, allFrames: true },
          world: 'MAIN',
          func: (h: string) => {
            try {
              const pres = document.querySelectorAll('pre[id^="aceeditor"]');
              const els = document.querySelectorAll('.ace_editor');
              if (pres.length === 0 && els.length === 0) return false;
              const w = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
              const ace = (w as Record<string, unknown>).ace || (typeof (globalThis as Record<string, unknown>).ace !== 'undefined' ? (globalThis as Record<string, unknown>).ace : null);
              const pickByMaxId = (arr: NodeListOf<Element>) => {
                let best: Element | null = null;
                let maxId = 0;
                for (let i = 0; i < arr.length; i++) {
                  const el = arr[i];
                  const id = el.id || (el.closest?.('pre[id^="aceeditor"]') as Element)?.id || '';
                  const m = id.match(/aceeditor(\d+)/);
                  const num = m ? parseInt(m[1], 10) : 0;
                  const r = (el as HTMLElement).getBoundingClientRect?.();
                  if (num > maxId && r && r.width > 80 && r.height > 80) { best = el; maxId = num; }
                }
                return best || (arr.length > 0 ? arr[arr.length - 1] : null);
              };
              const pre = pickByMaxId(pres) as HTMLPreElement | null;
              const el = pickByMaxId(els);
              if (pre && pre.id && ace && typeof (ace as { edit: (x: string) => { setValue: (v: string) => void } }).edit === 'function') {
                const ed = (ace as { edit: (x: string) => { setValue: (v: string) => void } }).edit(pre.id);
                if (ed && typeof ed.setValue === 'function') { ed.setValue(h); return true; }
              }
              if (el) {
                const aceEl = el as HTMLElement & { aceEditor?: { setValue: (v: string) => void }; env?: { editor?: { setValue: (v: string) => void } } };
                if (aceEl.aceEditor?.setValue) { aceEl.aceEditor.setValue(h); return true; }
                if (aceEl.env?.editor?.setValue) { aceEl.env.editor.setValue(h); return true; }
                if (ace && typeof (ace as { edit: (x: Element) => { setValue: (v: string) => void } }).edit === 'function') {
                  const ed = (ace as { edit: (x: Element) => { setValue: (v: string) => void } }).edit(el);
                  if (ed?.setValue) { ed.setValue(h); return true; }
                }
              }
            } catch (_) { }
            return false;
          }, args: [html]
        })
          .then((r) => sendResponse({ ok: (r && r.some((f) => f?.result === true)) || false }))
          .catch(() => sendResponse({ ok: false }));
      });
      return true;
    }
  }
);

async function getApiKey(): Promise<string> {
  const result = await chrome.storage.local.get(['geminiApiKey']);
  const key = (result as Record<string, string>).geminiApiKey;
  if (!key) throw new Error('API ключ не задан. Откройте настройки расширения.');
  return key;
}

async function handleSingleBlock(prompt: string): Promise<string> {
  const apiKey = await getApiKey();
  return callGemini(apiKey, prompt, `You are a CREATIVE web designer. Your goal: pages that cause a "wow" effect. No boring, template-like blocks. Use distinctive layouts, bold typography, memorable visual hooks. Generate clean HTML with inline CSS. Return ONLY HTML. No markdown. Use Russian text for Russian prompts. Premium, memorable design.`);
}

const SVG_ICON_SYSTEM = `You are an SVG icon designer. Generate a single inline SVG icon with SMIL or CSS animation.
- Return ONLY raw SVG code. No markdown, no code fences, no explanation.
- viewBox="0 0 SIZE SIZE" where SIZE is 24, 32, or 48.
- Use <animate>, <animateTransform>, <animateMotion> for real SVG animations.
- Colors: pick yourself. No external resources. Self-contained SVG.`;

const SVG_ANIMATION_SYSTEM = `You are an SVG animation artist. Generate an ANIMATED SVG — a real animated illustration or graphic.
- Return ONLY raw SVG code. No markdown, no code fences, no explanation.
- Use <animate>, <animateTransform>, <animateMotion> for SVG-native animations. Can also use <style> with @keyframes.
- Create an actual animated picture: moving elements, morphing shapes, flowing gradients, pulsing effects.
- Size: 200–600px. Colors: pick yourself. Self-contained SVG.`;

async function handleGenerateSvgIcon(description: string, size: number): Promise<string> {
  const apiKey = await getApiKey();
  const prompt = `Create an SVG icon: ${description}\n\nSize: ${size}x${size}. Return ONLY the <svg>...</svg> element.`;
  const raw = await callGemini(apiKey, prompt, SVG_ICON_SYSTEM);
  const match = raw.match(/<svg[\s\S]*?<\/svg>/i);
  return match ? match[0] : raw.trim();
}

async function handleGenerateSvgAnimation(description: string): Promise<string> {
  const apiKey = await getApiKey();
  const prompt = `Create an animated SVG: ${description}\n\nReturn ONLY the <svg>...</svg> element with animations inside.`;
  const raw = await callGemini(apiKey, prompt, SVG_ANIMATION_SYSTEM);
  const match = raw.match(/<svg[\s\S]*?<\/svg>/i);
  return match ? match[0] : raw.trim();
}

const ORCHESTRATOR_TEMPLATE_ADDON = `

IMPORTANT - REFERENCE TEMPLATE:
The user provided HTML of a reference page below. You MUST:
- Extract the visual style from it: colors (hex), typography, spacing, button style.
- Put those colors into your designSystem (primaryColor, secondaryColor, accentColor, bgLight, bgDark, textColor, textMuted).
- Match the structure: if the reference has hero, features, CTA, footer — plan similar blocks.
- Return ONLY the JSON. No explanation.`;

const MAX_TEMPLATE_CHARS = 12000;

const ANIM_PLAN_ADDON = `

ANIMATIONS ENABLED: Plan blocks that maximize visual impact. Prefer:
- Features/pricing/testimonials as card grids (for stagger + card lift).
- Clear h1/h2/h3 headings in each block (for text clip reveal).
- Interactive elements: buttons, icons (for glow hover).
- Layered sections where parallax adds depth.`;

async function handleAgentPlan(prompt: string, templateHtml?: string, animOpts?: AnimationOptions): Promise<AgentPlan> {
  const apiKey = await getApiKey();
  let systemPrompt = ORCHESTRATOR_PROMPT;
  let userPrompt = prompt;
  if (templateHtml?.trim()) {
    systemPrompt = ORCHESTRATOR_PROMPT + ORCHESTRATOR_TEMPLATE_ADDON;
    const truncated = templateHtml.trim().length > MAX_TEMPLATE_CHARS
      ? templateHtml.trim().slice(0, MAX_TEMPLATE_CHARS) + '\n...[truncated]'
      : templateHtml.trim();
    userPrompt = prompt + '\n\nREFERENCE PAGE HTML:\n' + truncated;
  }
  const hasAnim = animOpts && (animOpts.staggerReveal || animOpts.cardLift || animOpts.glowHover || animOpts.textClip || animOpts.parallax);
  if (hasAnim) userPrompt += ANIM_PLAN_ADDON;
  const raw = await callGemini(apiKey, userPrompt, systemPrompt);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Не удалось разобрать план от оркестратора');
  return JSON.parse(jsonMatch[0]) as AgentPlan;
}

async function handleAgentBlock(ds: DesignSystem, block: BlockPlan, idx: number, total: number, animOpts?: AnimationOptions): Promise<string> {
  const apiKey = await getApiKey();
  const prompt = makeBlockPrompt(ds, block, idx, total, animOpts);
  return callGemini(apiKey, block.description, prompt);
}
