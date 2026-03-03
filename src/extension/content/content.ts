import { PANEL_CSS } from './styles';

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

interface RecordedAction {
  n: number;
  step: string;
  ts: string;
  delayMs: number;
  action: 'click' | 'dblclick' | 'key';
  key?: string;
  docUrl: string;
  tag: string;
  id: string;
  classes: string;
  text: string;
  ariaLabel: string;
  role: string;
  rect: { w: number; h: number };
  path: string;
  selector: string;
  selectors: string[];
  inIframe: boolean;
  parentFormbox: string;
  parentRecord: string;
  parentRecordUi: string;
  tpRecordUiHovered: boolean;
}

class TildaSpaceAI {
  private shadow: ShadowRoot;
  private panel: HTMLElement;
  private fab: HTMLElement;
  private isOpen = false;
  private generatedBlocks: string[] = [];
  private recording = false;
  private recordedActions: RecordedAction[] = [];
  private recordingCounter = 0;
  private lastRecordTs = 0;

  constructor() {
    const host = document.createElement('div');
    host.id = 'tilda-space-ai-root';
    document.body.appendChild(host);
    this.shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = PANEL_CSS;
    this.shadow.appendChild(style);

    this.fab = this.createFAB();
    this.panel = this.createPanel();
    this.shadow.appendChild(this.panel);
    this.shadow.appendChild(this.fab);

    this.setupClickRecorder();
    this.checkApiKey();
  }

  private setupClickRecorder() {
    const host = document.querySelector('#tilda-space-ai-root');
    document.addEventListener('click', (e: MouseEvent) => {
      if (!this.recording || !host) return;
      const target = e.target as Node;
      if (target && host.contains(target)) return;
      const el = e.target as HTMLElement;
      if (!el || !el.getBoundingClientRect) return;
      this.recordAction(el, e.detail >= 2 ? 'dblclick' : 'click');
    }, true);
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.recording || !host) return;
      if (host.contains(e.target as Node)) return;
      if (['Escape', 'Enter', 'Tab'].includes(e.key)) {
        this.recordAction(null as unknown as HTMLElement, 'key', e.key);
      }
    }, true);
  }

  private getCssPath(el: HTMLElement): string {
    const parts: string[] = [];
    let current: HTMLElement | null = el;
    let depth = 0;
    while (current && depth < 8) {
      let part = current.tagName.toLowerCase();
      if (current.id && !/^\d/.test(current.id)) part += '#' + current.id;
      else if (current.className && typeof current.className === 'string') {
        const cls = current.className.trim().split(/\s+/).filter(c => !/^t\d/.test(c)).slice(0, 2).join('.');
        if (cls) part += '.' + cls;
      }
      parts.unshift(part);
      current = current.parentElement;
      depth++;
    }
    return parts.join(' > ');
  }

  private getSelector(el: HTMLElement): string {
    if (el.id && !/^\d/.test(el.id)) return '#' + el.id;
    const text = (el.innerText || '').trim().slice(0, 30);
    if (text) return `${el.tagName.toLowerCase()}:contains("${text.replace(/"/g, '\\"')}")`;
    if (el.getAttribute('aria-label')) return `[aria-label="${el.getAttribute('aria-label')}"]`;
    if (el.className && typeof el.className === 'string') {
      const c = el.className.trim().split(/\s+/)[0];
      if (c) return `${el.tagName.toLowerCase()}.${c}`;
    }
    return el.tagName.toLowerCase();
  }

  private recordAction(el: HTMLElement | null, actionType: 'click' | 'dblclick' | 'key', key?: string) {
    const now = Date.now();
    const delayMs = this.lastRecordTs ? now - this.lastRecordTs : 0;
    this.lastRecordTs = now;

    if (actionType === 'key') {
      const action: RecordedAction = {
        n: ++this.recordingCounter,
        step: `Шаг ${this.recordingCounter}: Нажать ${key}`,
        ts: new Date().toISOString(),
        delayMs,
        action: 'key',
        key: key || '',
        docUrl: document.location.href,
        tag: 'KEY',
        id: '',
        classes: '',
        text: key || '',
        ariaLabel: '',
        role: '',
        rect: { w: 0, h: 0 },
        path: '',
        selector: '',
        selectors: [],
        inIframe: false,
        parentFormbox: '',
        parentRecord: '',
        parentRecordUi: '',
        tpRecordUiHovered: false,
      };
      this.recordedActions.push(action);
      this.debugLog(`#${action.n} ⌨ ${key} (через ${delayMs}мс)`);
      for (const id of ['ts-recorder-copy', 'ts-recorder-copy-steps']) {
        const b = this.shadow.querySelector(`#${id}`) as HTMLButtonElement;
        if (b) b.disabled = false;
      }
      return;
    }

    if (!el?.getBoundingClientRect) return;
    const rect = el.getBoundingClientRect();
    const doc = el.ownerDocument;
    const docUrl = doc.defaultView?.location?.href || doc.URL || 'unknown';
    const inIframe = doc !== document;

    let parentFormbox = '';
    let parentRecord = '';
    let parentRecordUi = '';
    let tpRecordUiHovered = false;
    let p: HTMLElement | null = el;
    while (p && p !== document.body) {
      const pid = (p.id || '').match(/^formbox(\d+)$/);
      const rid = (p.id || '').match(/^(rec|record)\d+$/);
      if (pid) parentFormbox = p.id;
      if (rid) parentRecord = p.id;
      if (p.classList?.contains('tp-record-ui')) {
        parentRecordUi = p.className;
        tpRecordUiHovered = p.classList.contains('tp-record-ui_hovered') || false;
      }
      p = p.parentElement;
    }

    const selectors: string[] = [];
    if (el.id && !/^\d+$/.test(el.id)) selectors.push(`#${el.id}`);
    selectors.push(this.getSelector(el));
    selectors.push(this.getCssPath(el));
    const cls = (el.className && typeof el.className === 'string' ? el.className : '').trim().split(/\s+/).filter(c => c && !/^t\d/.test(c)).slice(0, 3).join('.');
    if (cls) selectors.push(`${el.tagName.toLowerCase()}.${cls}`);

    const text = (el.innerText || el.textContent || '').trim().slice(0, 80);
    const stepDesc = text || el.getAttribute('aria-label') || this.getSelector(el);

    const action: RecordedAction = {
      n: ++this.recordingCounter,
      step: `Шаг ${this.recordingCounter}: ${actionType === 'dblclick' ? 'Двойной клик' : 'Клик'} — ${stepDesc}`,
      ts: new Date().toISOString(),
      delayMs,
      action: actionType,
      docUrl,
      tag: el.tagName,
      id: el.id || '',
      classes: (el.className && typeof el.className === 'string' ? el.className : '') as string,
      text,
      ariaLabel: el.getAttribute('aria-label') || '',
      role: el.getAttribute('role') || '',
      rect: { w: Math.round(rect.width), h: Math.round(rect.height) },
      path: this.getCssPath(el),
      selector: this.getSelector(el),
      selectors: [...new Set(selectors)],
      inIframe,
      parentFormbox,
      parentRecord,
      parentRecordUi,
      tpRecordUiHovered,
    };
    this.recordedActions.push(action);
    for (const id of ['ts-recorder-copy', 'ts-recorder-copy-steps']) {
      const b = this.shadow.querySelector(`#${id}`) as HTMLButtonElement;
      if (b) b.disabled = false;
    }
    const ctx = [parentFormbox, parentRecord, tpRecordUiHovered ? 'hovered' : ''].filter(Boolean).join(' ');
    this.debugLog(`#${action.n} ${actionType === 'dblclick' ? '2×' : ''}${action.tag} "${stepDesc}" (${action.rect.w}×${action.rect.h}) +${delayMs}мс ${ctx ? `[${ctx}]` : ''}`);
  }

  private createFAB(): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'ts-fab';
    btn.textContent = '✨';
    btn.title = 'Tilda Space AI';
    btn.addEventListener('click', () => this.toggle());
    return btn;
  }

  private toggle() {
    this.isOpen = !this.isOpen;
    this.panel.classList.toggle('open', this.isOpen);
    this.fab.classList.toggle('active', this.isOpen);
    this.fab.textContent = this.isOpen ? '✕' : '✨';
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'ts-panel';
    panel.innerHTML = `
      <div class="ts-header">
        <h2>✨ Tilda Space AI</h2>
        <button class="ts-close">✕</button>
      </div>
      <div class="ts-body" id="ts-body"></div>
    `;
    panel.querySelector('.ts-close')!.addEventListener('click', () => this.toggle());
    return panel;
  }

  private getBody(): HTMLElement {
    return this.shadow.querySelector('#ts-body') as HTMLElement;
  }

  private async checkApiKey() {
    return new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, (r: { apiKey: string | null }) => {
        if (r?.apiKey) { this.renderPromptUI(); } else { this.renderNoKeyUI(); }
        resolve();
      });
    });
  }

  private renderNoKeyUI() {
    const body = this.getBody();
    body.innerHTML = `<div class="ts-no-key"><p>🔑 Задайте API ключ Gemini в настройках расширения</p><button class="ts-btn-open">Открыть настройки</button></div>`;
    body.querySelector('.ts-btn-open')!.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'OPEN_POPUP' }));
  }

  private renderPromptUI() {
    const body = this.getBody();
    body.innerHTML = `
      <div class="ts-prompt-area">
        <textarea id="ts-prompt" placeholder="Опишите сайт, который нужно создать...&#10;&#10;Система агентов создаст каждый блок в едином дизайне и вставит в Tilda"></textarea>
      </div>
      <div class="ts-template-row" style="display: none;">
        <button class="ts-template-btn" id="ts-use-as-template" type="button">📄 Использовать эту страницу как шаблон</button>
        <div class="ts-template-status" id="ts-template-status"></div>
      </div>
      <div class="ts-mode-row">
        <label class="ts-mode-label">
          <input type="checkbox" id="ts-single-block" />
          <span>Только 1 блок (для теста)</span>
        </label>
      </div>
      <div class="ts-recorder-row">
        <span class="ts-recorder-title">📹 Запись действий</span>
        <div class="ts-recorder-btns">
          <button class="ts-recorder-start" id="ts-recorder-start" type="button">Запустить</button>
          <button class="ts-recorder-stop" id="ts-recorder-stop" type="button" disabled>Стоп</button>
          <button class="ts-recorder-copy" id="ts-recorder-copy" type="button" disabled title="JSON для скрипта">Скопировать JSON</button>
          <button class="ts-recorder-copy-steps" id="ts-recorder-copy-steps" type="button" disabled title="Пошаговый лог">Скопировать пошагово</button>
        </div>
      </div>
      <button class="ts-generate-btn" id="ts-generate">🤖 Запустить агентов</button>
      <div class="ts-suggestions">
        <p>ГОТОВЫЕ СЦЕНАРИИ</p>
        <button class="ts-suggestion ts-suggestion-kvai" data-prompt="Лендинг для AI-сервиса: hero с фиолетовым градиентом #694be8, преимущества, модули/тарифы с иконками, FAQ аккордеон с желтой рамкой #e9cc57, отзывы, CTA, footer. Стиль: фиолетовый основной #694be8, желтый акцент #e9cc57, белый текст, современный premium">🔮 KV-AI Style (твой стиль)</button>
        <button class="ts-suggestion" data-prompt="Лендинг для IT-стартапа: SaaS платформа для управления проектами. Нужны hero, преимущества, о продукте, тарифы, отзывы, CTA, footer. Стиль: минималистичный, тёмный, как Linear или Vercel">🚀 IT-стартап (тёмный)</button>
        <button class="ts-suggestion" data-prompt="Лендинг для кофейни: уютная атмосфера, авторские напитки. Hero с фото, меню, о нас, галерея, отзывы, контакты, footer. Стиль: тёплый, кремовый, уютный">☕ Кофейня (тёплый)</button>
        <button class="ts-suggestion" data-prompt="Портфолио дизайнера: минималистичный стиль. Hero с именем, галерея работ, обо мне, навыки, контактная форма, footer. Стиль: чистый, белый, с акцентами">🎨 Портфолио (светлый)</button>
        <button class="ts-suggestion" data-prompt="Лендинг фитнес-клуба: энергичный дизайн. Hero, направления, расписание, тренеры, тарифы, отзывы, footer. Стиль: яркий, энергичный, с оранжевыми акцентами">💪 Фитнес-клуб (яркий)</button>
      </div>
      
      <!-- Секция основного лога генерации -->
      <div id="ts-agent-log"></div>

      <!-- Секция ДЛЯ ОТЛАДКИ -->
      <div class="ts-debug-section">
        <button class="ts-debug-toggle" id="ts-debug-toggle">🐛 Показать лог отладки (вставка в Tilda)</button>
        <div class="ts-debug-log" id="ts-debug-log" style="display: none;"></div>
      </div>
    `;

    const promptEl = body.querySelector('#ts-prompt') as HTMLTextAreaElement;
    const generateBtn = body.querySelector('#ts-generate') as HTMLButtonElement;
    const useTemplateBtn = body.querySelector('#ts-use-as-template') as HTMLButtonElement;
    const templateStatus = body.querySelector('#ts-template-status') as HTMLDivElement;

    this.updateTemplateStatus(templateStatus);

    useTemplateBtn.addEventListener('click', () => {
      const mainContent = document.querySelector('#allrecords') || document.querySelector('.t-container') || document.querySelector('main') || document.body;
      const html = mainContent === document.body ? document.documentElement.outerHTML : mainContent.innerHTML;
      chrome.storage.local.set({ templateHtml: html }, () => this.updateTemplateStatus(templateStatus));
    });

    generateBtn.addEventListener('click', () => {
      const p = promptEl.value.trim();
      if (p) {
        const singleBlock = (body.querySelector('#ts-single-block') as HTMLInputElement)?.checked ?? false;
        this.runAgents(p, singleBlock);
      }
    });

    promptEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        const p = promptEl.value.trim();
        if (p) {
          const singleBlock = (body.querySelector('#ts-single-block') as HTMLInputElement)?.checked ?? false;
          this.runAgents(p, singleBlock);
        }
      }
    });

    body.querySelectorAll('.ts-suggestion').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = (btn as HTMLElement).dataset.prompt || '';
        promptEl.value = p;
        promptEl.focus();
        // Ставим курсор в самое начало, чтобы пользователю было удобно дописать тему
        promptEl.selectionStart = 0;
        promptEl.selectionEnd = 0;
      });
    });

    const debugToggle = body.querySelector('#ts-debug-toggle');
    const debugLogEl = body.querySelector('#ts-debug-log') as HTMLElement;
    if (debugToggle && debugLogEl) {
      debugToggle.addEventListener('click', () => {
        const isHidden = debugLogEl.style.display === 'none';
        debugLogEl.style.display = isHidden ? 'block' : 'none';
        debugToggle.textContent = isHidden ? '🐛 Скрыть лог отладки' : '🐛 Показать лог отладки (вставка в Tilda)';
      });
    }

    // Рекордер кликов
    const recordStartBtn = body.querySelector('#ts-recorder-start') as HTMLButtonElement;
    const recordStopBtn = body.querySelector('#ts-recorder-stop') as HTMLButtonElement;
    const recordCopyBtn = body.querySelector('#ts-recorder-copy') as HTMLButtonElement;
    const recordCopyStepsBtn = body.querySelector('#ts-recorder-copy-steps') as HTMLButtonElement;
    const updateRecorderBtns = () => {
      if (recordStartBtn) recordStartBtn.disabled = this.recording;
      if (recordStopBtn) recordStopBtn.disabled = !this.recording;
      const has = this.recordedActions.length > 0;
      if (recordCopyBtn) recordCopyBtn.disabled = !has;
      if (recordCopyStepsBtn) recordCopyStepsBtn.disabled = !has;
    };
    if (recordStartBtn) {
      recordStartBtn.addEventListener('click', () => {
        this.recording = true;
        this.recordedActions = [];
        this.recordingCounter = 0;
        this.lastRecordTs = 0;
        this.debugLog('📹 Запись запущена. Выполняй шаги вручную — каждый клик и Escape записываются. Потом «Скопировать лог».');
        if (debugLogEl) { debugLogEl.style.display = 'block'; debugLogEl.scrollTop = debugLogEl.scrollHeight; }
        updateRecorderBtns();
      });
    }
    if (recordStopBtn) {
      recordStopBtn.addEventListener('click', () => {
        this.recording = false;
        this.debugLog(`📹 Запись остановлена. Записано ${this.recordedActions.length} действий.`);
        updateRecorderBtns();
      });
    }
    if (recordCopyBtn) {
      recordCopyBtn.addEventListener('click', () => {
        const json = JSON.stringify(this.recordedActions, null, 2);
        navigator.clipboard.writeText(json).then(() => {
          recordCopyBtn.textContent = '✓ JSON';
          setTimeout(() => { recordCopyBtn.textContent = 'Скопировать JSON'; }, 2000);
        });
      });
    }
    if (recordCopyStepsBtn) {
      recordCopyStepsBtn.addEventListener('click', () => {
        const lines: string[] = ['=== ЗАПИСЬ ДЕЙСТВИЙ TILDA ===', ''];
        for (const a of this.recordedActions) {
          lines.push(a.step);
          lines.push(`  Задержка перед шагом: ${a.delayMs}мс`);
          if (a.action === 'key') {
            lines.push(`  Клавиша: ${a.key}`);
          } else {
            lines.push(`  Селектор: ${a.selector}`);
            lines.push(`  Путь: ${a.path}`);
            if (a.selectors?.length) lines.push(`  Варианты: ${a.selectors.join(' | ')}`);
            if (a.parentFormbox) lines.push(`  formbox: ${a.parentFormbox}`);
            if (a.parentRecord) lines.push(`  record: ${a.parentRecord}`);
            if (a.tpRecordUiHovered) lines.push(`  tp-record-ui: HOVERED`);
            if (a.inIframe) lines.push(`  (в iframe)`);
          }
          lines.push('');
        }
        navigator.clipboard.writeText(lines.join('\n')).then(() => {
          recordCopyStepsBtn.textContent = '✓ Пошагово';
          setTimeout(() => { recordCopyStepsBtn.textContent = 'Скопировать пошагово'; }, 2000);
        });
      });
    }
  }

  private updateTemplateStatus(el: HTMLDivElement | null) {
    if (!el) return;
    chrome.storage.local.get(['templateHtml'], (result: Record<string, string>) => {
      const hasTemplate = !!(result.templateHtml && result.templateHtml.trim());
      el.innerHTML = hasTemplate
        ? '<span class="ts-template-set">✓ Шаблон загружен</span> <button type="button" class="ts-template-clear" id="ts-clear-template">Очистить</button>'
        : '';
      const clearBtn = this.shadow.querySelector('#ts-clear-template');
      if (clearBtn) clearBtn.addEventListener('click', () => {
        chrome.storage.local.remove('templateHtml', () => this.updateTemplateStatus(el));
      });
    });
  }

  // ─── Agent System ───

  private debugLog(msg: string) {
    const el = this.shadow.querySelector('#ts-debug-log');
    if (el) {
      const time = new Date().toLocaleTimeString('ru-RU', { hour12: false });
      el.innerHTML += `<div><span style="color:#64748b">[${time}]</span> ${msg}</div>`;
      el.scrollTop = el.scrollHeight;
    }
  }

  private clearDebugLog() {
    const el = this.shadow.querySelector('#ts-debug-log');
    if (el) el.innerHTML = '';
  }

  private escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  private log(html: string) {
    const logEl = this.shadow.querySelector('#ts-agent-log');
    if (logEl) {
      logEl.innerHTML = html;
      this.scrollToBottom();
    }
  }

  private appendLog(html: string) {
    const logEl = this.shadow.querySelector('#ts-agent-log');
    if (logEl) {
      logEl.innerHTML += html;
      this.scrollToBottom();
    }
  }

  private scrollToBottom() {
    const body = this.getBody();
    if (body) {
      setTimeout(() => body.scrollTop = body.scrollHeight, 50);
    }
  }

  private async runAgents(prompt: string, singleBlockMode = false) {
    const generateBtn = this.shadow.querySelector('#ts-generate') as HTMLButtonElement;
    generateBtn.disabled = true;
    generateBtn.textContent = '🤖 Агенты работают...';
    this.generatedBlocks = [];
    this.clearDebugLog();
    this.debugLog('▶ Запуск генерации...');
    const debugLogEl = this.shadow.querySelector('#ts-debug-log') as HTMLElement;
    const debugToggle = this.shadow.querySelector('#ts-debug-toggle');
    if (debugLogEl && debugToggle) {
      debugLogEl.style.display = 'block';
      debugToggle.textContent = '🐛 Скрыть лог отладки';
    }

    try {
      // Phase 1: Orchestrator creates design system and plan
      this.debugLog('Оркестратор: создаю план страницы...');
      this.log(`
        <div class="ts-agent-phase">
          <div class="ts-agent-title">🎨 Дизайн-агент</div>
          <div class="ts-agent-status">
            <div class="ts-spinner"></div>
            Создаю единый дизайн и план страницы...
          </div>
        </div>
      `);

      const templateHtml = await this.getStoredTemplate();
      const planResp = await this.sendMessage({
        type: 'AGENT_PLAN',
        prompt,
        templateHtml,
      }) as { success: boolean; plan?: AgentPlan; error?: string };
      if (!planResp.success || !planResp.plan) throw new Error(planResp.error || 'Ошибка планирования');
      const plan = planResp.plan;
      this.debugLog(`Оркестратор ✓ План: ${plan.blocks.length} блоков (${plan.blocks.map(b => b.type).join(', ')})`);

      this.log(`
        <div class="ts-agent-phase done">
          <div class="ts-agent-title">🎨 Дизайн-агент ✓</div>
          <div class="ts-design-preview">
            <div class="ts-color-row">
              <span class="ts-color-dot" style="background:${plan.designSystem.primaryColor}"></span>
              <span class="ts-color-dot" style="background:${plan.designSystem.secondaryColor}"></span>
              <span class="ts-color-dot" style="background:${plan.designSystem.accentColor}"></span>
              <span class="ts-color-dot" style="background:${plan.designSystem.bgDark}"></span>
              <span class="ts-color-dot" style="background:${plan.designSystem.bgLight}"></span>
            </div>
            <div class="ts-plan-blocks">${plan.blocks.length} блоков: ${plan.blocks.map(b => b.type).join(' → ')}</div>
          </div>
        </div>
      `);

      // Phase 2a: Генерируем все блоки ПАРАЛЛЕЛЬНО
      const blocksToGenerate = singleBlockMode ? plan.blocks.slice(0, 1) : plan.blocks;
      if (singleBlockMode) {
        this.appendLog(`<div class="ts-agent-phase" style="border-left-color:#eab308"><div class="ts-agent-title">⚠️ Режим теста: генерирую только 1 блок</div></div>`);
      }
      this.appendLog(`<div class="ts-agent-phase" style="border-left-color:#3b82f6"><div class="ts-agent-title">⚡ Генерация блоков (параллельно)</div><div class="ts-agent-status" style="font-size:11px;color:#64748b">Ожидайте завершения всех блоков...</div></div>`);
      for (let i = 0; i < blocksToGenerate.length; i++) {
        const block = blocksToGenerate[i];
        this.appendLog(`
          <div class="ts-agent-phase" id="ts-block-${i}">
            <div class="ts-agent-title">🔨 Блок ${i + 1}/${blocksToGenerate.length}: ${block.type}</div>
            <div class="ts-agent-status">
              <div class="ts-spinner"></div>
              Генерирую...
            </div>
          </div>
        `);
      }
      const blockPromises = blocksToGenerate.map((block, i) =>
        this.sendMessage({
          type: 'AGENT_BLOCK',
          designSystem: plan.designSystem,
          block,
          blockIndex: i,
          totalBlocks: blocksToGenerate.length,
        }).then((resp: Record<string, unknown>) => {
          const r = resp as { success: boolean; html?: string; error?: string };
          if (r.success && r.html) {
            this.updateBlockStatus(i, '✅', 'Готово');
            this.debugLog(`Блок ${i + 1} готов, длина: ${r.html.length}`);
          } else {
            this.updateBlockStatus(i, '❌', `Ошибка: ${r.error || 'unknown'}`);
            this.debugLog(`❌ Блок ${i + 1}: ${r.error}`);
          }
          return { index: i, ...r };
        })
      );
      const blockResults = await Promise.all(blockPromises);
      const successfulBlocks: { index: number; html: string }[] = blockResults
        .filter((r): r is { index: number; success: true; html: string } => r.success === true && !!r.html)
        .map(r => ({ index: r.index, html: r.html }));
      successfulBlocks.forEach(({ html }) => this.generatedBlocks.push(html));
      this.debugLog(`Параллельная генерация завершена: ${successfulBlocks.length}/${blocksToGenerate.length} блоков`);

      // Phase 2b: Вставляем блоки ПО ОДНОМУ (Tilda не поддерживает параллельную вставку)
      this.appendLog(`<div class="ts-agent-phase" style="border-left-color:#8b5cf6"><div class="ts-agent-title">📥 Публикация в Tilda (по одному)</div></div>`);
      for (let j = 0; j < successfulBlocks.length; j++) {
        const { index: originalIndex, html } = successfulBlocks[j];
        const htmlPreview = html.length > 1500 ? html.slice(0, 1500) + '...[обрезано]' : html;
        this.debugLog(`--- КОД БЛОКА ${originalIndex + 1} (начало) ---`);
        this.debugLog(`<pre style="margin:4px 0;font-size:10px;overflow:auto;max-height:150px">${this.escapeHtml(htmlPreview)}</pre>`);
        this.debugLog(`--- конец превью ---`);
        this.updateBlockStatus(originalIndex, '📥', 'Вставляю в Tilda...');
        const inserted = await this.insertBlockIntoTilda(html, j);
        this.updateBlockStatus(originalIndex, inserted ? '✅' : '📋', inserted ? 'Вставлен' : 'Скопирован');
      }

      // Phase 3: Publish (только если не режим "1 блок")
      if (!singleBlockMode) {
        this.appendLog(`
        <div class="ts-agent-phase" id="ts-publish">
          <div class="ts-agent-title">🚀 Публикация</div>
          <div class="ts-agent-status">
            <div class="ts-spinner"></div>
            Публикую страницу...
          </div>
        </div>
      `);

      const published = await this.publishPage();

      const publishEl = this.shadow.querySelector('#ts-publish');
      if (publishEl) {
        publishEl.className = 'ts-agent-phase done';
        publishEl.innerHTML = published
          ? `<div class="ts-agent-title">🚀 Публикация ✓</div><div class="ts-agent-status" style="color:#166534">Страница опубликована!</div>`
          : `<div class="ts-agent-title">🚀 Публикация</div><div class="ts-agent-status" style="color:#92400e">Нажмите "Опубликовать" вручную</div>`;
      }
      }

      // Final summary (всегда показываем)
      this.appendLog(`
        <div class="ts-agent-done">
          <div style="font-size:20px;margin-bottom:8px">🎉</div>
          <div style="font-weight:700;margin-bottom:4px">${this.generatedBlocks.length} блоков создано!</div>
          <div style="font-size:12px;color:#64748b">Страница собрана в едином дизайне</div>
          <button class="ts-action-btn ts-btn-copy" id="ts-copy-all" style="margin-top:12px;width:100%">📋 Копировать весь HTML</button>
        </div>
      `);

      const copyAllBtn = this.shadow.querySelector('#ts-copy-all');
      if (copyAllBtn) {
        copyAllBtn.addEventListener('click', () => {
          const fullHtml = this.generatedBlocks.join('\n\n');
          this.clipboardWrite(fullHtml);
          (copyAllBtn as HTMLElement).textContent = '✓ Скопировано!';
        });
      }

    } catch (err) {
      this.debugLog(`❌ Критическая ошибка: ${err instanceof Error ? err.message : String(err)}`);
      this.appendLog(`<div class="ts-error">❌ ${err instanceof Error ? err.message : 'Ошибка'}</div>`);
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = '🤖 Запустить агентов';
    }
  }

  private updateBlockStatus(index: number, icon: string, text: string) {
    const el = this.shadow.querySelector(`#ts-block-${index}`);
    if (!el) return;
    const statusEl = el.querySelector('.ts-agent-status');
    if (statusEl) statusEl.innerHTML = `${icon} ${text}`;
  }

  private sendMessage(msg: Record<string, unknown>): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (r) => resolve(r as Record<string, unknown>));
    });
  }

  private getStoredTemplate(): Promise<string | undefined> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['templateHtml'], (result: Record<string, string>) => {
        resolve(result.templateHtml?.trim() || undefined);
      });
    });
  }

  private getSearchableDocuments(): Document[] {
    const seen = new Set<Document>();
    const add = (doc: Document) => {
      if (!doc || seen.has(doc)) return;
      seen.add(doc);
      docs.push(doc);
      doc.querySelectorAll('iframe').forEach((iframe) => {
        try {
          if (iframe.contentDocument) add(iframe.contentDocument);
        } catch {
          /* cross-origin */
        }
      });
    };
    const docs: Document[] = [];
    add(document);
    return docs;
  }

  private findByTextInDoc(doc: Document, selector: string, text: string): HTMLElement | null {
    const elements = doc.querySelectorAll(selector);
    for (const el of elements) {
      if ((el as HTMLElement).innerText?.trim().toLowerCase() === text.toLowerCase()) {
        return el as HTMLElement;
      }
    }
    return null;
  }

  private safeClick(el: HTMLElement) {
    el.scrollIntoView({ block: 'center' });
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  }

  private hoverEl(el: HTMLElement) {
    el.scrollIntoView({ block: 'center' });
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
    el.dispatchEvent(new MouseEvent('mouseover', opts));
    el.dispatchEvent(new MouseEvent('mouseenter', { ...opts, bubbles: false }));
    el.dispatchEvent(new MouseEvent('mousemove', opts));
  }

  private async waitForInAny(fn: (doc: Document) => HTMLElement | null, timeout = 3000): Promise<HTMLElement | null> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const docs = this.getSearchableDocuments();
      for (const doc of docs) {
        const el = fn(doc);
        if (el) return el;
      }
      await this.wait(100);
    }
    return null;
  }

  // ─── HTML Sanitize (Tilda требует валидный HTML) ───

  private fixHtmlForTilda(html: string): string {
    const trimmed = html.trim();
    if (!trimmed) return trimmed;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<body>${trimmed}</body>`, 'text/html');
      const body = doc.body;
      if (!body) return trimmed;
      const fixed = body.innerHTML.trim();
      return fixed || trimmed;
    } catch {
      return trimmed;
    }
  }

  // ─── Tilda Insertion ───

  private async insertBlockIntoTilda(html: string, blockIndex = 0): Promise<boolean> {
    this.debugLog(`Начинаю вставку блока ${blockIndex + 1}...`);
    try {
      const fixed = this.fixHtmlForTilda(html);
      if (fixed !== html) this.debugLog('HTML исправлен (незакрытые теги)');
      await this.clipboardWrite(fixed);
      this.debugLog(`HTML в буфере (${fixed.length} символов)`);

      // Запоминаем max ID до добавления
      let prevMaxRecId = 0;
      for (const doc of this.getSearchableDocuments()) {
        for (const r of doc.querySelectorAll('[id^="rec"]')) {
          const m = r.id.match(/^rec(\d+)$/);
          if (m) { const n = parseInt(m[1], 10); if (n > prevMaxRecId) prevMaxRecId = n; }
        }
      }
      this.debugLog(`prevMaxRecId = ${prevMaxRecId}`);

      // Esc чтобы закрыть всё открытое
      this.debugLog('Закрываю панели (Esc)...');
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
      await this.wait(800);

      // Для ВСЕХ блоков — "Все блоки" (ставит currentRecord на новый блок, "+"-поток этого не делает!)
      this.debugLog('Открываю "Все блоки"...');
      const allBlocksBtn = await this.waitForInAny((doc) => {
        const byId = doc.getElementById('tp_btn_allblock');
        if (byId) return byId as HTMLElement;
        const byText = this.findByTextInDoc(doc, 'a, button, div, span', 'все блоки');
        if (byText) return byText;
        const svg = doc.querySelector('#shortcuttooldiv .tp-shortcuttools__one-item-icon svg');
        return svg ? (svg as HTMLElement) : null;
      }, 3000);
      if (!allBlocksBtn) { this.debugLog('❌ Кнопка "Все блоки" не найдена'); return false; }
      this.safeClick(allBlocksBtn);
      this.debugLog('Кликнул "Все блоки"');
      await this.wait(1200);

      // Другое
      this.debugLog('Ищу категорию "Другое"...');
      const otherCat = await this.waitForInAny((doc) => {
        const el = doc.querySelector('.tp-library__type-title');
        if ((el as HTMLElement)?.innerText?.trim().toLowerCase() === 'другое') return el as HTMLElement;
        for (const t of doc.querySelectorAll('.tp-library__type-body, .tp-library__type-title')) {
          if ((t as HTMLElement).innerText?.trim().toLowerCase() === 'другое') return t as HTMLElement;
        }
        return this.findByTextInDoc(doc, 'a, div, li, span', 'другое');
      }, 3000);
      if (!otherCat) { this.debugLog('❌ Категория "Другое" не найдена'); return false; }
      this.safeClick(otherCat);
      this.debugLog('Кликнул "Другое"');
      await this.wait(800);

      // T123
      this.debugLog('Ищу блок T123 "HTML-код"...');
      const t123 = await this.waitForInAny((doc) => {
        const list12 = doc.querySelector('#tplslist12');
        const searchRoot = list12 || doc;
        for (const wrap of searchRoot.querySelectorAll('.tp-library__tpl-thirdwrapper')) {
          const t = (wrap as HTMLElement).innerText?.trim() ?? '';
          if (t.includes('868') || t.toLowerCase().includes('popup')) continue;
          if (!t.includes('T123') && !t.includes('HTML')) continue;
          const img = wrap.querySelector('.tp-library__tpl-icon');
          return (img || wrap) as HTMLElement;
        }
        for (const wrap of doc.querySelectorAll('.tp-library__tpl-thirdwrapper')) {
          const t = (wrap as HTMLElement).innerText?.trim() ?? '';
          if ((t.includes('T123') || t.includes('HTML-код')) && !t.includes('868')) {
            const img = wrap.querySelector('.tp-library__tpl-icon');
            return (img || wrap) as HTMLElement;
          }
        }
        return null;
      }, 3000);
      if (!t123) { this.debugLog('❌ Блок T123 не найден'); return false; }
      this.debugLog('Кликаю по T123');

      this.safeClick(t123);
      await this.wait(1500);
      // Закрываем библиотеку, чтобы не перекрывала блоки
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
      await this.wait(500);

      if (blockIndex >= 5) {
        const arr = Array.from(document.querySelectorAll('#allrecords [id^="rec"]')).filter(el => /^rec\d+$/.test((el as HTMLElement).id));
        const lastRec = arr[arr.length - 1] as HTMLElement | undefined;
        if (lastRec) {
          lastRec.scrollIntoView({ block: 'end', behavior: 'smooth' });
          await this.wait(400);
        }
      }

      // Ищем НОВЫЙ блок только для blockIndex > 0
      let newBlockEl: HTMLElement | null = null;
      if (blockIndex > 0) {
        this.debugLog('Жду новый блок на странице...');
        newBlockEl = await this.waitForInAny((doc) => {
          const candidates: HTMLElement[] = [];
          for (const r of doc.querySelectorAll('[id^="rec"]')) {
            if (r.id === 'allrecords' || r.id.startsWith('record')) continue;
            const m = r.id.match(/^rec(\d+)$/);
            if (m && parseInt(m[1], 10) > prevMaxRecId) candidates.push(r as HTMLElement);
          }
          if (candidates.length > 0) {
            candidates.sort((a, b) => {
              const na = parseInt(a.id.replace(/\D/g, ''), 10);
              const nb = parseInt(b.id.replace(/\D/g, ''), 10);
              return nb - na;
            });
            return candidates[0];
          }
          const allRecords = doc.getElementById('allrecords');
          const recs = allRecords?.querySelectorAll('[id^="rec"]:not(#allrecords)') || [];
          const arr = Array.from(recs).filter(el => /^rec\d+$/.test(el.id));
          if (arr.length > blockIndex) return arr[arr.length - 1] as HTMLElement;
          return null;
        }, 5000);
      }

      if (newBlockEl && blockIndex > 0) {
        newBlockEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        await this.wait(blockIndex >= 5 ? 1000 : 600);
        const rect = newBlockEl.getBoundingClientRect();
        const mx = Math.round(rect.left + rect.width / 2);
        const my = Math.round(rect.top + Math.min(rect.height / 2, 80));
        this.debugLog(`Блок ${newBlockEl.id}: CDP клик по (${mx},${my})`);
        const cdpOk = await new Promise<boolean>((r) => {
          chrome.runtime.sendMessage({ type: 'CDP_CLICK', x: mx, y: my }, (resp: { ok?: boolean }) => r(resp?.ok === true));
        });
        this.debugLog(cdpOk ? 'CDP клик OK' : 'CDP: включите отладку в chrome://extensions');
        const hoveredAppeared = await this.waitForInAny((doc) => {
          const el = doc.querySelector('.tp-record-ui.tp-record-ui_hovered');
          return el ? (el as HTMLElement) : null;
        }, 1200);
        if (hoveredAppeared) this.debugLog('Панель блока активна');
        await this.wait(500);
      } else if (blockIndex > 0) {
        this.debugLog('⚠ Новый блок не найден — откроется блок 1');
      }

      // Ищем "Контент" — для blockIndex > 0 предпочитаем tp-record-ui_hovered
      this.debugLog('Жду кнопку "Контент"...');
      const contentBtn = await this.waitForInAny((doc) => {
        const hovered = doc.querySelector('.tp-record-ui.tp-record-ui_hovered');
        if (blockIndex > 0 && hovered) {
          for (const span of hovered.querySelectorAll('.tp-record-ui__button-text')) {
            if ((span as HTMLElement).innerText?.trim() === 'Контент') {
              return (span.closest('button') || span) as HTMLElement;
            }
          }
        }
        for (const span of doc.querySelectorAll('.tp-record-ui__button-text')) {
          if ((span as HTMLElement).innerText?.trim() === 'Контент') {
            return (span.closest('button') || span) as HTMLElement;
          }
        }
        return this.findByTextInDoc(doc, 'button', 'контент');
      }, 3000);

      if (!contentBtn) { this.debugLog('❌ Кнопка "Контент" не найдена'); return false; }
      this.debugLog('Кликаю "Контент"');
      if (blockIndex > 0) {
        (contentBtn as HTMLElement).scrollIntoView({ block: 'center' });
        await this.wait(150);
        const cRect = (contentBtn as HTMLElement).getBoundingClientRect();
        const cx = Math.round(cRect.left + cRect.width / 2);
        const cy = Math.round(cRect.top + cRect.height / 2);
        const cdpClickOk = await new Promise<boolean>((r) => {
          chrome.runtime.sendMessage({ type: 'CDP_CLICK', x: cx, y: cy }, (resp: { ok?: boolean }) => r(resp?.ok === true));
        });
        if (!cdpClickOk) this.safeClick(contentBtn);
      } else {
        this.safeClick(contentBtn);
      }
      await this.wait(blockIndex >= 5 ? 2500 : 2000);

      // Диагностика: какой formbox открылся?
      for (const doc of this.getSearchableDocuments()) {
        for (const fb of doc.querySelectorAll('[id^="formbox"]')) {
          const r = (fb as HTMLElement).getBoundingClientRect();
          if (r.width > 10) this.debugLog(`formbox видим: ${fb.id} (${r.width}x${r.height})`);
        }
      }

      let pasted = await this.pasteIntoEditor(fixed);
      if (!pasted && blockIndex >= 5) {
        this.debugLog('Повтор вставки для последнего блока...');
        await this.wait(500);
        pasted = await this.pasteIntoEditor(fixed);
      }
      if (pasted) {
        this.debugLog('Код вставлен');
        return await this.saveAndCloseBlock();
      }

      this.debugLog('❌ Не удалось вставить код в редактор');
      return false;
    } catch (err) {
      this.debugLog('❌ Ошибка выполнения вставки: ' + (err instanceof Error ? err.message : String(err)));
      return false;
    }
  }

  private async saveAndCloseBlock(): Promise<boolean> {
    this.debugLog('Ищу кнопку "Сохранить и закрыть"...');
    const saveBtn = await this.waitForInAny((doc) => {
      let maxId = 0; let bestBtn: HTMLElement | null = null;
      for (const fb of doc.querySelectorAll('[id^="formbox"]')) {
        const m = fb.id.match(/formbox(\d+)/);
        const n = m ? parseInt(m[1], 10) : 0;
        const r = (fb as HTMLElement).getBoundingClientRect();
        if (r.width < 10) continue;
        for (const btn of fb.querySelectorAll('button.tbtn.tbtn-primary')) {
          const br = (btn as HTMLElement).getBoundingClientRect();
          if (br.width > 10 && (btn as HTMLElement).innerText?.includes('Сохранить') && n >= maxId) {
            maxId = n; bestBtn = btn as HTMLElement;
          }
        }
      }
      if (bestBtn) return bestBtn;
      for (const btn of doc.querySelectorAll('button.tbtn.tbtn-primary')) {
        if ((btn as HTMLElement).innerText?.trim().toLowerCase().includes('сохранить')) return btn as HTMLElement;
      }
      return this.findByTextInDoc(doc, 'a, button, div, span', 'сохранить и закрыть')
          || this.findByTextInDoc(doc, 'a, button, div, span', 'сохранить');
    }, 3000);
    if (saveBtn) {
      (saveBtn as HTMLElement).scrollIntoView({ block: 'center' });
      await this.wait(150);
      this.safeClick(saveBtn);
      this.debugLog('Кликнул "Сохранить и закрыть", жду закрытия формы...');
      await this.wait(2500); // Ждём завершения AJAX-сохранения и закрытия формы
      return true;
    }
    this.debugLog('⚠️ Кнопка сохранения не найдена');
    return false;
  }

  private injectAceSetValue(doc: Document, el: HTMLElement, html: string): boolean {
    try {
      const script = doc.createElement('script');
      script.textContent = `(function(){
        var all = document.querySelectorAll('.ace_editor');
        var el = all.length > 0 ? all[all.length - 1] : null;
        if (!el) return false;
        if (el.aceEditor && el.aceEditor.setValue) {
          el.aceEditor.setValue(${JSON.stringify(html)});
          return true;
        }
        if (el.env && el.env.editor && el.env.editor.setValue) {
          el.env.editor.setValue(${JSON.stringify(html)});
          return true;
        }
        if (typeof ace !== 'undefined' && ace.edit) {
          var ed = ace.edit(el);
          if (ed && ed.setValue) { ed.setValue(${JSON.stringify(html)}); return true; }
        }
        var pres = document.querySelectorAll('pre[id^="aceeditor"]');
        var pre = pres.length > 0 ? pres[pres.length - 1] : null;
        if (pre && pre.id && typeof ace !== 'undefined') {
          var e = ace.edit(pre.id);
          if (e && e.setValue) { e.setValue(${JSON.stringify(html)}); return true; }
        }
        return false;
      })();`;
      (doc.head || doc.documentElement).appendChild(script);
      script.remove();
      this.debugLog('Инъекция ace.setValue выполнена');
      return true;
    } catch (e) {
      this.debugLog('Инъекция: ' + (e instanceof Error ? e.message : 'ошибка'));
      return false;
    }
  }

  private async pasteIntoEditor(html: string, _minFormboxId = 0): Promise<boolean> {
    await this.wait(300);

    // Фокус на редакторе перед вставкой
    let toFocus: HTMLElement | null = null;
    for (const doc of this.getSearchableDocuments()) {
      const pre = doc.querySelector('pre[id^="aceeditor"]');
      const aceContent = doc.querySelector('.ace_content, .ace_editor');
      const el = (pre || aceContent) as HTMLElement | null;
      if (el && el.getBoundingClientRect().width > 50) { toFocus = el; break; }
    }
    if (toFocus) {
      toFocus.focus?.();
      this.safeClick(toFocus);
      await this.wait(200);
    }

    // ACE_INJECT — выполняется в контексте страницы
    const viaScripting = await new Promise<boolean>((r) => {
      chrome.runtime.sendMessage({ type: 'ACE_INJECT', html }, (resp: { ok?: boolean }) => r(resp?.ok === true));
    });
    if (viaScripting) {
      this.debugLog('Вставлено через ACE_INJECT');
      return true;
    }

    const docs = this.getSearchableDocuments();
    for (const doc of docs) {
      const formboxes = doc.querySelectorAll('[id^="formbox"]');
      let targetBox: Element | null = null;
      let maxId = 0;
      for (const box of formboxes) {
        const m = (box.id || '').match(/formbox(\d+)/);
        const num = m ? parseInt(m[1], 10) : 0;
        if (num > maxId) { maxId = num; targetBox = box; }
      }
      const lastBox = targetBox || (formboxes.length > 0 ? formboxes[formboxes.length - 1] : null);
      const aceInLast = lastBox?.querySelector('.ace_content, .ace_editor, pre[id^="aceeditor"]');
      const candidates = aceInLast ? [aceInLast] : Array.from(doc.querySelectorAll('.ace_content, .ace_editor, pre[id^="aceeditor"]'));
      this.debugLog(`Formbox: ${formboxes.length}, ACE: ${candidates.length}`);

      const g = (doc.defaultView || window) as unknown as { ace?: { edit: (e: Element | string) => { setValue: (v: string) => void } } };
      for (const el of candidates) {
        const aceContent = el as HTMLElement;
        const rect = aceContent.getBoundingClientRect();
        if (rect.width < 20 || rect.height < 20) continue;
        const preEl = aceContent.closest?.('pre[id^="aceeditor"]') || (aceContent.tagName === 'PRE' && aceContent.id?.startsWith('aceeditor') ? aceContent : null);
        this.safeClick(aceContent);
        await this.wait(200);
        const aceEl = aceContent.classList?.contains('ace_editor') ? aceContent : aceContent.closest?.('.ace_editor');
        const aceElTyped = aceEl as (HTMLElement & { aceEditor?: { setValue: (v: string) => void }; env?: { editor?: { setValue: (v: string) => void } } });
        const editor = (aceElTyped && aceElTyped.aceEditor) || (aceElTyped && aceElTyped.env && aceElTyped.env.editor);
        if (editor && typeof editor.setValue === 'function') {
          editor.setValue(html);
          this.debugLog('Вставил через aceEditor/env.editor');
          return true;
        }
        if (preEl?.id && g?.ace?.edit) {
          try {
            const ed = g.ace.edit((preEl as HTMLPreElement).id);
            if (ed?.setValue) { ed.setValue(html); this.debugLog('Вставил через ace.edit'); return true; }
          } catch { /* ignore */ }
        }
        this.injectAceSetValue(doc, aceContent, html);
        const retry = await new Promise<boolean>((r) => {
          chrome.runtime.sendMessage({ type: 'ACE_INJECT', html }, (resp: { ok?: boolean }) => r(resp?.ok === true));
        });
        if (retry) return true;
        aceContent.focus?.();
        doc.execCommand('paste');
        this.debugLog('Попытка execCommand paste');
        return true;
      }
    }

    // CodeMirror
    for (const doc of docs) {
      const cmEls = doc.querySelectorAll('.CodeMirror');
      this.debugLog(`Нашёл ${cmEls.length} CodeMirror, ${doc.querySelectorAll('.ace_content').length} ACE в документе`);
      for (const cmEl of cmEls) {
        const cm = (cmEl as HTMLElement & { CodeMirror?: { setValue: (v: string) => void } }).CodeMirror;
        if (cm?.setValue) {
          const rect = (cmEl as HTMLElement).getBoundingClientRect();
          if (rect.width > 30 && rect.height > 30) {
            cm.setValue(html);
            this.debugLog('Вставил в CodeMirror (видимый)');
            return true;
          }
        }
      }
      for (const cmEl of cmEls) {
        const cm = (cmEl as HTMLElement & { CodeMirror?: { setValue: (v: string) => void } }).CodeMirror;
        if (cm?.setValue) {
          cm.setValue(html);
          this.debugLog('Вставил в CodeMirror');
          return true;
        }
      }
    }

    // Textarea
    for (const doc of docs) {
      for (const ta of doc.querySelectorAll('textarea')) {
        const rect = ta.getBoundingClientRect();
        if (rect.width > 50 && rect.height > 20) {
          ta.focus();
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
          if (setter) setter.call(ta, html); else ta.value = html;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          ta.dispatchEvent(new Event('change', { bubbles: true }));
          this.debugLog('Вставил в textarea');
          return true;
        }
      }
    }

    // Fallback: contenteditable и попытка Ctrl+V (буфер уже заполнен)
    for (const doc of docs) {
      const editables = doc.querySelectorAll('[contenteditable="true"]');
      this.debugLog(`Нашёл ${editables.length} contenteditable`);
      for (const el of editables) {
        const rect = (el as HTMLElement).getBoundingClientRect();
        if (rect.width > 80 && rect.height > 30) {
          (el as HTMLElement).focus();
          (el as HTMLElement).innerHTML = html;
          (el as HTMLElement).dispatchEvent(new Event('input', { bubbles: true }));
          this.debugLog('Вставил в contenteditable');
          return true;
        }
      }
    }

    // Fallback: имитация Ctrl+V (буфер уже заполнен, пользователь мог вручную кликнуть в редактор)
    try {
      const ev = new KeyboardEvent('keydown', { key: 'v', code: 'KeyV', ctrlKey: true, keyCode: 86, bubbles: true });
      document.body.dispatchEvent(ev);
      this.debugLog('Отправил Ctrl+V в body');
    } catch {
      /* ignore */
    }

    return false;
  }

  private async publishPage(): Promise<boolean> {
    try {
      const pubBtn = document.getElementById('page_menu_publishlink')
        || this.findByText('a, button, div, span', 'опубликовать');
      if (!pubBtn) return false;
      this.safeClick(pubBtn as HTMLElement);
      await this.wait(2000);

      // Confirm publish dialog
      const confirmBtn = this.findByText('a, button, div, span', 'опубликовать')
        || this.findByText('a, button, div, span', 'publish');
      if (confirmBtn && confirmBtn !== pubBtn) {
        this.safeClick(confirmBtn as HTMLElement);
        await this.wait(2000);
      }
      return true;
    } catch {
      return false;
    }
  }

  // ─── Helpers ───

  private findByText(sel: string, text: string): HTMLElement | null {
    for (const el of document.querySelectorAll(sel)) {
      const t = (el as HTMLElement).innerText?.trim().toLowerCase() || '';
      if (t.includes(text.toLowerCase())) return el as HTMLElement;
    }
    return null;
  }

  private async waitFor(fn: () => HTMLElement | null, ms = 5000): Promise<HTMLElement | null> {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const el = fn();
      if (el) return el;
      await this.wait(200);
    }
    return null;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async clipboardWrite(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;left:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TildaSpaceAI());
} else {
  new TildaSpaceAI();
}
