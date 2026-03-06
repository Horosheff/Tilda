import {
  callGemini,
  extractHtmlText,
  makeAgentBlockPrompt,
  sanitizeBlockRootVisualEffects,
} from '../shared/aiRuntime';
import type { AnimationOptions, BlockPlan, DesignSystem } from '../shared/aiRuntime';

export interface BlockWorkerInput {
  designSystem: DesignSystem;
  block: BlockPlan;
  blockIndex: number;
  totalBlocks: number;
  animOptions?: AnimationOptions;
  model: string;
}

export async function runBlockWorker(apiKey: string, input: BlockWorkerInput): Promise<string> {
  const prompt = makeAgentBlockPrompt(
    input.designSystem,
    input.block,
    input.blockIndex,
    input.totalBlocks,
    input.animOptions
  );

  const raw = await callGemini(apiKey, prompt, {
    temperature: 0.35,
    maxOutputTokens: 60000,
    model: input.model,
  });

  return sanitizeBlockRootVisualEffects(extractHtmlText(raw));
}
