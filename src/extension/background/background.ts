const SYSTEM_PROMPT = `You are a top-tier web designer and frontend developer. You generate complete, production-ready HTML pages and blocks for the Tilda website builder.

OUTPUT FORMAT:
- Return ONLY raw HTML. No markdown, no code fences, no explanations, no comments.
- Use INLINE CSS for ALL styles (style= attributes). No <style> tags, no classes, no external CSS.
- Wrap everything in a single root <div>.

DESIGN REQUIREMENTS:
- Modern, premium, magazine-quality design. Think Apple, Stripe, Linear.
- Use system fonts: font-family: 'Inter', system-ui, -apple-system, sans-serif
- Responsive: use max-width, percentage widths, clamp(), min(), flexbox.
- Rich spacing: sections need 80-120px vertical padding, 20-40px horizontal.
- Beautiful gradients, subtle shadows, rounded corners (12-20px).
- Professional color palettes. Never use raw primary colors.
- Use real Unsplash image URLs: https://images.unsplash.com/photo-{id}?w=800&q=80
- For buttons: padding 16px 40px, border-radius 12px, font-weight 600.
- For Russian prompts, write ALL text in Russian. For English — in English.

FULL PAGE GENERATION:
When asked to create a "page" or "landing" or "site", generate a COMPLETE page with multiple sections:
1. Hero section (big headline, subtitle, CTA button, optional background image)
2. Features / benefits section (3-4 cards with icons/images)
3. About / description section
4. Testimonials or social proof (if relevant)
5. CTA / contact section
6. Footer with links and copyright

Each section should be a separate visual block inside the root div, with distinct backgrounds alternating between white and light gray (#f8fafc).

SINGLE BLOCK GENERATION:
When asked for a specific block (hero, footer, form, pricing, etc.), generate just that one block, fully styled and self-contained.`;

interface Message {
  type: string;
  prompt?: string;
}

chrome.runtime.onMessage.addListener(
  (message: Message, _sender: chrome.runtime.MessageSender, sendResponse: (response: Record<string, unknown>) => void) => {
    if (message.type === 'GENERATE_HTML') {
      handleGenerate(message.prompt || '')
        .then((html) => sendResponse({ success: true, html }))
        .catch((err: Error) => sendResponse({ success: false, error: String(err.message || err) }));
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

async function handleGenerate(prompt: string): Promise<string> {
  const result = await chrome.storage.local.get(['geminiApiKey']);
  const apiKey = (result as Record<string, string>).geminiApiKey;
  if (!apiKey) {
    throw new Error('API ключ Gemini не задан. Откройте настройки расширения.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 16384,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  const cleaned = text
    .replace(/^```html?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  if (!cleaned) {
    throw new Error('Gemini вернул пустой ответ');
  }

  return cleaned;
}
