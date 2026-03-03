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

interface AgentPlan {
  designSystem: DesignSystem;
  blocks: BlockPlan[];
}

// ─── System Prompts ───

const ORCHESTRATOR_PROMPT = `You are a web design orchestrator AI. Given a user request for a website page, you must:

1. Create a DESIGN SYSTEM (color palette, typography, spacing, button styles) that will be shared across ALL blocks
2. Plan the page structure as a list of blocks

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
- Choose a COHESIVE, PREMIUM color palette. Think Stripe, Linear, Vercel.
- Plan 4-7 blocks depending on the request.
- Each block description should be detailed: content, layout, specific elements.
- For Russian prompts, write descriptions in Russian.
- Return ONLY the JSON. No explanation.`;

function makeBlockPrompt(ds: DesignSystem, block: BlockPlan, blockIndex: number, totalBlocks: number): string {
  return `You are a block-level web designer agent. You are generating block ${blockIndex + 1} of ${totalBlocks} for a page.

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

RULES:
- Return ONLY raw HTML. No markdown, no code fences, no explanation.
- CRITICAL: All tags MUST be properly closed (every <div> has </div>, <p> has </p>, etc.). Tilda rejects invalid HTML.
- Use INLINE CSS for ALL styles. No <style> tags, no classes.
- Use the EXACT colors and styles from the design system above.
- Wrap in a single <div> with full-width.
- Make it responsive (max-width, %, flexbox, clamp()).
- Use real Unsplash URLs for images: https://images.unsplash.com/photo-{id}?w=800&q=80
- Content in Russian if the description is in Russian.
- This block must look like it belongs to a cohesive, professional page.`;
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
      const templateHtml = (message as Message & { templateHtml?: string }).templateHtml;
      handleAgentPlan(message.prompt || '', templateHtml)
        .then((plan) => sendResponse({ success: true, plan }))
        .catch((err: Error) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    if (message.type === 'AGENT_BLOCK') {
      const msg = message as Message & { designSystem: DesignSystem; block: BlockPlan; blockIndex: number; totalBlocks: number };
      handleAgentBlock(msg.designSystem, msg.block, msg.blockIndex, msg.totalBlocks)
        .then((html) => sendResponse({ success: true, html }))
        .catch((err: Error) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    if (message.type === 'GET_API_KEY') {
      chrome.storage.local.get(['geminiApiKey'], (result: Record<string, string>) => {
        sendResponse({ apiKey: result.geminiApiKey || null });
      });
      return true;
    }

    const runCdpSequence = (tabId: number, cmds: Array<{ method: string; params: Record<string, unknown> }>, done: () => void) => {
      let i = 0;
      const run = () => {
        if (i >= cmds.length) {
          chrome.debugger.detach({ tabId }, () => {});
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
          } catch (_) {}
          return false;
        }, args: [html] })
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
  return callGemini(apiKey, prompt, `You are a web designer. Generate clean HTML with inline CSS. Return ONLY HTML. No markdown. Use Russian text for Russian prompts. Professional design.`);
}

const ORCHESTRATOR_TEMPLATE_ADDON = `

IMPORTANT - REFERENCE TEMPLATE:
The user provided HTML of a reference page below. You MUST:
- Extract the visual style from it: colors (hex), typography, spacing, button style.
- Put those colors into your designSystem (primaryColor, secondaryColor, accentColor, bgLight, bgDark, textColor, textMuted).
- Match the structure: if the reference has hero, features, CTA, footer — plan similar blocks.
- Return ONLY the JSON. No explanation.`;

const MAX_TEMPLATE_CHARS = 12000;

async function handleAgentPlan(prompt: string, templateHtml?: string): Promise<AgentPlan> {
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
  const raw = await callGemini(apiKey, userPrompt, systemPrompt);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Не удалось разобрать план от оркестратора');
  return JSON.parse(jsonMatch[0]) as AgentPlan;
}

async function handleAgentBlock(ds: DesignSystem, block: BlockPlan, idx: number, total: number): Promise<string> {
  const apiKey = await getApiKey();
  const prompt = makeBlockPrompt(ds, block, idx, total);
  return callGemini(apiKey, block.description, prompt);
}
