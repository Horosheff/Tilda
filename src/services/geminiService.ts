import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Block } from '../types';

const SYSTEM_PROMPT = `You are a web page builder AI assistant. You generate page blocks as JSON arrays.

Each block must have an "id" (use format "ai-{number}"), a "type", and a "props" object.

Available block types and their props:

1. "heading": { text: string, level: 1|2|3, align: "left"|"center"|"right", color: string(hex) }
2. "text": { text: string, align: "left"|"center"|"right", fontSize: number(14-24), color: string(hex) }
3. "image": { src: string(valid unsplash URL like https://images.unsplash.com/photo-{id}?w=800&q=80), alt: string, width: string, borderRadius: number }
4. "button": { text: string, url: string, variant: "filled"|"outlined"|"text", color: string(hex), bgColor: string(hex), align: "left"|"center"|"right" }
5. "spacer": { height: number(16-96) }
6. "divider": { color: string(hex), thickness: number(1-4), width: string }
7. "form": { fields: [{ id: string, label: string, type: "text"|"email"|"textarea", placeholder: string, required: boolean }], submitText: string, bgColor: string(hex) }

Rules:
- Return ONLY a valid JSON array of blocks. No markdown, no explanation, no code fences.
- Use beautiful, professional colors. Prefer modern design.
- Use real Unsplash image URLs for images.
- Create complete, well-structured pages with proper spacing.
- For Russian prompts, generate Russian text content. For English prompts, use English.
- Always include at least a heading and some content.
- Make the design look professional and modern.`;

const TEMPLATE_INSTRUCTION = `

IMPORTANT - REFERENCE TEMPLATE:
The user provided HTML of a reference page below. You MUST:
- Extract the visual style: colors (hex), typography, spacing, button style, section layout.
- Reuse that design system in your JSON (primaryColor, secondaryColor, etc. from the reference).
- Match the structure and block types if the reference has hero, features, CTA, footer etc.
- Return ONLY a valid JSON array. No markdown, no explanation.`;

const MAX_TEMPLATE_CHARS = 12000;

let genAI: GoogleGenerativeAI | null = null;

export function initGemini(apiKey: string) {
  genAI = new GoogleGenerativeAI(apiKey);
}

export function isGeminiInitialized(): boolean {
  return genAI !== null;
}

export async function generatePageBlocks(prompt: string, templateHtml?: string): Promise<Block[]> {
  if (!genAI) {
    throw new Error('Gemini API not initialized. Please set your API key.');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });

  const parts: Array<{ text: string }> = [
    { text: SYSTEM_PROMPT },
    { text: `Generate a page for: ${prompt}` },
  ];

  if (templateHtml?.trim()) {
    const truncated = templateHtml.trim().length > MAX_TEMPLATE_CHARS
      ? templateHtml.trim().slice(0, MAX_TEMPLATE_CHARS) + '\n...[truncated]'
      : templateHtml.trim();
    parts.push({ text: TEMPLATE_INSTRUCTION + '\n\nREFERENCE PAGE HTML:\n' + truncated });
  }

  const result = await model.generateContent(parts);

  const response = result.response;
  const text = response.text().trim();

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response as JSON block array');
  }

  const blocks: Block[] = JSON.parse(jsonMatch[0]);

  return blocks.map((block, i) => ({
    ...block,
    id: `ai-${Date.now()}-${i}`,
  }));
}

export async function generateBlockFromPrompt(prompt: string, blockType: string): Promise<Block> {
  if (!genAI) {
    throw new Error('Gemini API not initialized.');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro-preview' });

  const result = await model.generateContent([
    { text: SYSTEM_PROMPT },
    { text: `Generate a single "${blockType}" block for: ${prompt}. Return a JSON object (not array), just one block.` },
  ]);

  const response = result.response;
  const text = response.text().trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI response');
  }

  const block: Block = JSON.parse(jsonMatch[0]);
  return { ...block, id: `ai-${Date.now()}` };
}
