import {
  AGENT_ANIM_PLAN_ADDON,
  AGENT_ORCHESTRATOR_PROMPT,
  AGENT_ORCHESTRATOR_TEMPLATE_ADDON,
  callGemini,
  extractHtmlText,
  extractJsonText,
} from '../shared/aiRuntime';
import type {
  AnimationOptions,
  AgentPlan,
  BlockPlan,
  DesignSystem,
} from '../shared/aiRuntime';
import { runBlockWorker } from './blockWorker';
import type { BlockWorkerInput } from './blockWorker';

type BlockAgentStatus = 'queued' | 'running' | 'retrying' | 'success' | 'error';

interface BlockAgentJob {
  jobId: string;
  planId?: string;
  blockIndex: number;
  blockType: string;
  status: BlockAgentStatus;
  attempts: number;
  maxRetries: number;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  nextRetryAt?: number;
  html?: string;
  error?: string;
  input: BlockWorkerInput;
}

const blockJobRegistry = new Map<string, BlockAgentJob>();
const BLOCK_AGENT_MAX_RETRIES = 3;
const BLOCK_AGENT_RETRY_DELAY_MS = 5000;

// ─── Message Handlers ───

interface Message {
  type: string;
  prompt?: string;
  jobId?: string;
  planId?: string;
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

    if (message.type === 'START_BLOCK_AGENT') {
      const msg = message as Message & {
        planId?: string;
        designSystem: DesignSystem;
        block: BlockPlan;
        blockIndex: number;
        totalBlocks: number;
        animOptions?: AnimationOptions;
      };

      startBlockAgentJob({
        planId: msg.planId,
        designSystem: msg.designSystem,
        block: msg.block,
        blockIndex: msg.blockIndex,
        totalBlocks: msg.totalBlocks,
        animOptions: msg.animOptions,
      })
        .then((job) => sendResponse({ success: true, job }))
        .catch((err: Error) => sendResponse({ success: false, error: err.message }));
      return true;
    }

    if (message.type === 'GET_BLOCK_AGENT_STATUS') {
      const job = message.jobId ? getBlockAgentSnapshot(message.jobId) : null;
      sendResponse(job ? { success: true, job } : { success: false, error: 'Block agent job not found' });
      return false;
    }

    if (message.type === 'GET_BLOCK_AGENT_RESULT') {
      const job = message.jobId ? getBlockAgentResult(message.jobId) : null;
      sendResponse(job ? { success: true, job } : { success: false, error: 'Block agent result not found' });
      return false;
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
  const model = await getStoredModel();
  const raw = await callGemini(apiKey, prompt, {
    systemPrompt: 'You are a professional Tilda HTML developer. Return ONLY valid HTML for one block. Use inline CSS, production-friendly markup, and visible readable text.',
    temperature: 0.35,
    maxOutputTokens: 8192,
    model,
  });
  return extractHtmlText(raw);
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
  const model = await getStoredModel();
  const prompt = `Create an SVG icon: ${description}\n\nSize: ${size}x${size}. Return ONLY the <svg>...</svg> element.`;
  const raw = await callGemini(apiKey, prompt, { systemPrompt: SVG_ICON_SYSTEM, temperature: 0.4, maxOutputTokens: 4096, model });
  const match = raw.match(/<svg[\s\S]*?<\/svg>/i);
  return match ? match[0] : raw.trim();
}

async function handleGenerateSvgAnimation(description: string): Promise<string> {
  const apiKey = await getApiKey();
  const model = await getStoredModel();
  const prompt = `Create an animated SVG: ${description}\n\nReturn ONLY the <svg>...</svg> element with animations inside.`;
  const raw = await callGemini(apiKey, prompt, { systemPrompt: SVG_ANIMATION_SYSTEM, temperature: 0.45, maxOutputTokens: 4096, model });
  const match = raw.match(/<svg[\s\S]*?<\/svg>/i);
  return match ? match[0] : raw.trim();
}

const MAX_TEMPLATE_CHARS = 12000;

async function handleAgentPlan(prompt: string, templateHtml?: string, animOpts?: AnimationOptions): Promise<AgentPlan> {
  const apiKey = await getApiKey();
  const model = await getStoredModel();
  let systemPrompt = AGENT_ORCHESTRATOR_PROMPT;
  let userPrompt = `USER REQUEST:\n${prompt}`;
  if (templateHtml?.trim()) {
    systemPrompt = AGENT_ORCHESTRATOR_PROMPT + AGENT_ORCHESTRATOR_TEMPLATE_ADDON;
    const truncated = templateHtml.trim().length > MAX_TEMPLATE_CHARS
      ? templateHtml.trim().slice(0, MAX_TEMPLATE_CHARS) + '\n...[truncated]'
      : templateHtml.trim();
    userPrompt += '\n\nREFERENCE PAGE HTML:\n' + truncated;
  }
  const hasAnim = animOpts && (animOpts.staggerReveal || animOpts.cardLift || animOpts.glowHover || animOpts.textClip || animOpts.parallax);
  if (hasAnim) userPrompt += AGENT_ANIM_PLAN_ADDON;
  const raw = await callGemini(apiKey, userPrompt, {
    systemPrompt,
    temperature: 0.35,
    maxOutputTokens: 4096,
    model,
  });
  return JSON.parse(extractJsonText(raw)) as AgentPlan;
}

async function handleAgentBlock(ds: DesignSystem, block: BlockPlan, idx: number, total: number, animOpts?: AnimationOptions): Promise<string> {
  const apiKey = await getApiKey();
  const model = await getStoredModel();
  return runBlockWorker(apiKey, {
    designSystem: ds,
    block,
    blockIndex: idx,
    totalBlocks: total,
    animOptions: animOpts,
    model,
  });
}

async function getStoredModel(): Promise<string> {
  const result = await chrome.storage.local.get(['selectedModel']);
  return (result as Record<string, string>).selectedModel || 'gemini-2.5-pro';
}

function isRetryableAgentError(err: string): boolean {
  return /503|429|500|504|UNAVAILABLE|high demand|Resource exhausted|overloaded/i.test(err || '');
}

function toBlockAgentSnapshot(job: BlockAgentJob) {
  return {
    jobId: job.jobId,
    planId: job.planId,
    blockIndex: job.blockIndex,
    blockType: job.blockType,
    status: job.status,
    attempts: job.attempts,
    maxRetries: job.maxRetries,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    nextRetryAt: job.nextRetryAt,
    error: job.error,
  };
}

function getBlockAgentSnapshot(jobId: string) {
  const job = blockJobRegistry.get(jobId);
  return job ? toBlockAgentSnapshot(job) : null;
}

function getBlockAgentResult(jobId: string) {
  const job = blockJobRegistry.get(jobId);
  if (!job) return null;
  return {
    ...toBlockAgentSnapshot(job),
    html: job.html,
  };
}

async function startBlockAgentJob(args: {
  planId?: string;
  designSystem: DesignSystem;
  block: BlockPlan;
  blockIndex: number;
  totalBlocks: number;
  animOptions?: AnimationOptions;
}) {
  const model = await getStoredModel();
  const jobId = crypto.randomUUID();
  const job: BlockAgentJob = {
    jobId,
    planId: args.planId,
    blockIndex: args.blockIndex,
    blockType: args.block.type,
    status: 'queued',
    attempts: 0,
    maxRetries: BLOCK_AGENT_MAX_RETRIES,
    createdAt: Date.now(),
    input: {
      designSystem: args.designSystem,
      block: args.block,
      blockIndex: args.blockIndex,
      totalBlocks: args.totalBlocks,
      animOptions: args.animOptions,
      model,
    },
  };

  blockJobRegistry.set(jobId, job);
  void runBlockAgentJob(jobId);
  return toBlockAgentSnapshot(job);
}

async function runBlockAgentJob(jobId: string): Promise<void> {
  const job = blockJobRegistry.get(jobId);
  if (!job) return;

  let apiKey = '';
  try {
    apiKey = await getApiKey();
  } catch (err) {
    job.status = 'error';
    job.error = err instanceof Error ? err.message : String(err);
    job.finishedAt = Date.now();
    return;
  }

  while (job.attempts < job.maxRetries) {
    job.attempts += 1;
    job.status = job.attempts === 1 ? 'running' : 'retrying';
    job.startedAt = job.startedAt || Date.now();
    job.nextRetryAt = undefined;
    job.error = undefined;

    try {
      const html = await runBlockWorker(apiKey, job.input);
      job.status = 'success';
      job.html = html;
      job.finishedAt = Date.now();
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      job.error = message;

      if (job.attempts >= job.maxRetries || !isRetryableAgentError(message)) {
        job.status = 'error';
        job.finishedAt = Date.now();
        return;
      }

      job.status = 'retrying';
      job.nextRetryAt = Date.now() + BLOCK_AGENT_RETRY_DELAY_MS;
      await new Promise((resolve) => setTimeout(resolve, BLOCK_AGENT_RETRY_DELAY_MS));
    }
  }

  job.status = 'error';
  job.finishedAt = Date.now();
}
