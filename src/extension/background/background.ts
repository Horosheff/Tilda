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
      handleAgentPlan(message.prompt || '')
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

async function handleAgentPlan(prompt: string): Promise<AgentPlan> {
  const apiKey = await getApiKey();
  const raw = await callGemini(apiKey, prompt, ORCHESTRATOR_PROMPT);
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Не удалось разобрать план от оркестратора');
  return JSON.parse(jsonMatch[0]) as AgentPlan;
}

async function handleAgentBlock(ds: DesignSystem, block: BlockPlan, idx: number, total: number): Promise<string> {
  const apiKey = await getApiKey();
  const prompt = makeBlockPrompt(ds, block, idx, total);
  return callGemini(apiKey, block.description, prompt);
}
