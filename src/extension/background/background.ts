const SYSTEM_PROMPT = `You are an expert web designer creating HTML blocks for Tilda website builder.

Generate clean, professional, responsive HTML code that can be pasted into a Tilda T123 (HTML) block.

Rules:
- Return ONLY raw HTML code. No markdown, no code fences, no explanations.
- Use INLINE CSS for ALL styles (style attributes). No <style> tags, no external CSS.
- Make the design responsive using max-width, percentage widths, and flexible layouts.
- Use modern, professional design: clean typography, balanced spacing, harmonious colors.
- Use system fonts: font-family: 'Inter', system-ui, -apple-system, sans-serif
- Include proper padding (40-80px vertical, 20-40px horizontal) and margins.
- Use real Unsplash image URLs for placeholder images: https://images.unsplash.com/photo-{id}?w=800&q=80
- For Russian prompts, generate Russian text content. For English prompts, use English.
- Create visually appealing, production-ready blocks.
- Wrap everything in a single container div.

Common block types you can generate:
- Hero section (big heading, subtitle, CTA button, background image)
- Feature grid (icons/images with titles and descriptions)
- Testimonials (quotes with author info)
- Pricing tables
- Contact forms
- Image galleries
- Team sections
- FAQ accordions
- Footer blocks
- Call-to-action sections
- Stats/numbers sections`;

interface GenerateMessage {
  type: 'GENERATE_HTML';
  prompt: string;
}

interface GetKeyMessage {
  type: 'GET_API_KEY';
}

type Message = GenerateMessage | GetKeyMessage;

chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse: (response: unknown) => void) => {
    if (message.type === 'GENERATE_HTML') {
      handleGenerate(message.prompt)
        .then((html) => sendResponse({ success: true, html }))
        .catch((err) => sendResponse({ success: false, error: String(err.message || err) }));
      return true;
    }

    if (message.type === 'GET_API_KEY') {
      chrome.storage.local.get(['geminiApiKey'], (result) => {
        sendResponse({ apiKey: result.geminiApiKey || null });
      });
      return true;
    }
  }
);

async function handleGenerate(prompt: string): Promise<string> {
  const result = await chrome.storage.local.get(['geminiApiKey']);
  const apiKey = result.geminiApiKey;
  if (!apiKey) {
    throw new Error('API ключ Gemini не задан. Откройте настройки расширения.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT },
              { text: `Create this block/page: ${prompt}` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 8192,
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
