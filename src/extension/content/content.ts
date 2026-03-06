import { PANEL_CSS } from './styles';
import type { DesignSystem, BlockPlan, AgentPlan, AnimationOptions } from '../shared/aiRuntime';
import { createLargeTestBlocks, type TestBlock } from '../shared/testBlocks';
import type { RecordedAction, BlockAgentJobSnapshot, BlockAgentJobResult, TildaUploadParams, TildaUploadResponse } from './types';
import { applyAnimations, fixHtmlForTilda, exportAsHtmlFile, clipboardWrite } from './htmlUtils';


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
  private readonly testBlockMinLength = 2500;
  private lastPlan: { designSystem: DesignSystem; blocks: BlockPlan[]; animOptions: AnimationOptions } | null = null;
  private generationHistory: { timestamp: number; prompt: string; blocksCount: number }[] = [];
  private generationAborted = false;

  constructor() {
    const host = document.createElement('div');
    host.id = 'tilda-space-ai-root';
    host.style.position = 'fixed';
    host.style.zIndex = '2147483647';
    host.style.top = '0';
    host.style.right = '0';
    host.style.width = '0';
    host.style.height = '0';
    host.style.pointerEvents = 'none';
    document.body.appendChild(host);
    this.shadow = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = PANEL_CSS + `
      :host { pointer-events: none; }
      .ts-fab, .ts-panel { pointer-events: auto; }
    `;
    this.shadow.appendChild(style);

    this.fab = this.createFAB();
    this.panel = this.createPanel();
    this.shadow.appendChild(this.panel);
    this.shadow.appendChild(this.fab);

    this.setupClickRecorder();
    this.setupRuntimeHandlers();
    this.setupHotkeys();
    this.checkApiKey();

    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.geminiApiKey) {
        this.checkApiKey();
      }
    });
  }

  private setupRuntimeHandlers() {
    chrome.runtime.onMessage.addListener((message: { type?: string; html?: string }, _sender, sendResponse) => {
      if (message.type === 'GET_PAGE_HTML') {
        sendResponse({ html: this.getCurrentPageHtml() });
        return false;
      }

      if (message.type === 'INSERT_BLOCK') {
        const html = typeof message.html === 'string' ? message.html : '';
        if (!html.trim()) {
          sendResponse({ success: false, error: 'Пустой HTML блок' });
          return false;
        }

        this.insertBlockIntoTilda(html)
          .then((success) => sendResponse(success
            ? { success: true }
            : { success: false, error: 'Не удалось вставить HTML в Tilda' }))
          .catch((err: Error) => sendResponse({ success: false, error: err.message }));

        return true;
      }

      return false;
    });
  }

  private setupHotkeys() {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter → trigger generate
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && this.isOpen) {
        e.preventDefault();
        const genBtn = this.shadow.querySelector('#tsa-generate-btn') as HTMLButtonElement | null;
        if (genBtn && !genBtn.disabled) genBtn.click();
      }
      // Escape → close panel
      if (e.key === 'Escape' && this.isOpen) {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  private getCurrentPageHtml(): string {
    const mainContent = document.querySelector('#allrecords')
      || document.querySelector('.t-container')
      || document.querySelector('main')
      || document.body;

    return mainContent === document.body
      ? document.documentElement.outerHTML
      : (mainContent as HTMLElement).innerHTML;
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
    this.updateFabIcon(btn, false);
    btn.title = 'Tilda Space AI';
    btn.addEventListener('click', () => this.toggle());
    return btn;
  }

  private updateFabIcon(btn: HTMLElement, isOpen: boolean) {
    btn.innerHTML = isOpen
      ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
      : `
      <svg class="tfe-cloud-icon" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <path class="tfe-cloud-base" fill="#ffffff" d="M9 22C5.686 22 3 19.314 3 16C3 12.686 5.686 10 9 10C9.663 10 10.298 10.113 10.887 10.316C12.15 7.24 15.228 5 18.8 5C23.329 5 27 8.582 27 13C27 13.111 26.998 13.221 26.993 13.332C28.749 14.194 30 16.035 30 18.2C30 21.403 27.403 24 24.2 24L9 22Z"/>
        <path class="tfe-cloud-top" fill="rgba(255,255,255,0.8)" d="M14 19C11.791 19 10 17.209 10 15C10 12.791 11.791 11 14 11C14.442 11 14.865 11.075 15.258 11.21C16.1 9.16 18.152 7.667 20.533 7.667C23.553 7.667 26 10.055 26 13C26 13.074 25.999 13.147 25.995 13.221C27.166 13.796 28 15.023 28 16.467C28 18.602 26.269 20.333 24.133 20.333L14 19Z"/>
        <circle class="tfe-particle p1" cx="8" cy="8" r="1.5" fill="#fff" />
        <circle class="tfe-particle p2" cx="24" cy="6" r="2" fill="#fff" />
        <circle class="tfe-particle p3" cx="28" cy="22" r="1" fill="#fff" />
        <circle class="tfe-particle p4" cx="6" cy="24" r="1.5" fill="#fff" />
      </svg>
    `;
  }

  private toggle() {
    this.isOpen = !this.isOpen;
    this.panel.classList.toggle('active', this.isOpen);
    this.fab.classList.toggle('active', this.isOpen);
    this.updateFabIcon(this.fab, this.isOpen);
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'ts-panel';
    panel.innerHTML = `
      <div class="ts-header">
        <div class="ts-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 22h20L12 2z"/></svg>
          Tilda Space AI
        </div>
        <button class="ts-settings-icon" id="ts-settings-header" aria-label="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </button>
        <button class="ts-close" id="ts-close-header" aria-label="Close">✕</button>
      </div>
      <div class="ts-body" id="ts-body"></div>
    `;
    panel.querySelector('#ts-close-header')!.addEventListener('click', () => this.toggle());
    panel.querySelector('#ts-settings-header')!.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'OPEN_POPUP' }));
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
    body.innerHTML = `
      <div style="text-align:center; padding: 40px 20px;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" style="margin-bottom: 16px;">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <h3 style="margin-bottom: 8px; font-weight: 700; color: #0f172a;">Требуется ключ API</h3>
        <p style="color: #64748b; font-size: 13px; margin-bottom: 24px; line-height: 1.5;">Для генерации контента подключите ваш Gemini API ключ в настройках расширения.</p>
        <button class="ts-btn-primary" id="ts-open-settings-nokey">Открыть настройки</button>
      </div>
    `;
    body.querySelector('#ts-open-settings-nokey')!.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'OPEN_POPUP' }));
  }

  private renderPromptUI() {
    const body = this.getBody();
    body.innerHTML = `
      <!-- Generator Accordion -->
      <div class="ts-accordion-wrap open">
        <button class="ts-accordion-header" type="button">
          🎨 Генерация блока
          <svg class="ts-accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div class="ts-accordion-body">
          <label class="ts-label" style="margin-top:0">Промпт дизайна</label>
          <textarea id="ts-prompt" class="ts-input" placeholder="Опишите структуру и стиль блока... (напр. 'Темный hero-блок с 3D анимацией')"></textarea>
          
          <div class="ts-template-row" style="display: none; margin-top: 8px;">
            <button class="ts-btn-secondary" id="ts-use-as-template" type="button">📄 Использовать как шаблон</button>
            <div class="ts-template-status" id="ts-template-status" style="font-size: 12px; color: #64748b; margin-top: 4px;"></div>
          </div>
          
          <div style="margin-top: 12px;">
            <label class="ts-pill-checkbox">
              <input type="checkbox" id="ts-single-block" class="ts-visually-hidden ts-pill-checkbox-input" />
              <span class="ts-pill-label">Включить локальный 1 блок</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Scenarios Accordion -->
      <div class="ts-accordion-wrap">
        <button class="ts-accordion-header" type="button">
          📚 Готовые сценарии
          <svg class="ts-accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div class="ts-accordion-body">
          <div class="ts-suggestions-scroll">
            <button class="ts-suggestion ts-suggestion-kvai" data-prompt="Создай визуально ошеломляющий, ультрапремиальный лендинг из 7 блоков для авангардного web-бутика &quot;NeuroSync&quot;, который делает сайты с фокусом на 3D, motion-дизайн и нестандартный UX.

Стиль и арт-дирекшн: &quot;Cyber-Elegance&quot;. Кинематографичный, темный интерфейс с максимальной глубиной. Основной цвет — абсолютный черный (#000000). Акценты: неоновый пурпурный (Magenta, #FF00FF) или жидкое золото. Вместо стандартных карточек — слоистые &quot;стеклянные&quot; панели с эффектом зернистости (noise/grain). Очень крупная, нестандартная, выразительная типографика.

Тон и копирайт: Высокомерный, но чертовски привлекательный. Мало слов, больше визуального веса у каждой фразы. Мы не агентство, мы — лаборатория цифрового искусства. Мы создаем web-проекты, которые выигрывают награды и сводят с ума конкурентов.

СТРУКТУРА СТРАНИЦЫ И JQUERY-ИНТЕРАКТИВЫ (Ровно 7 блоков):

1. Hero Intro: Гигантский H1-заголовок, занимающий 80% экрана (&quot;РАЗРУШАЕМ ПРЕДЕЛЫ WEB-ДИЗАЙНА&quot;). На фоне нужен jQuery-скрипт: при движении мышки (mousemove) элементы заголовка и фоновые абстрактные шейпы должны двигаться с эффектом крутого параллакса с разной скоростью.
2. Манифест (Scroll Reveal): Текстовый блок с огромной дерзкой цитатой. Через jQuery реализуй появление текста побуквенно или по словам по мере скролла до этого элемента.
3. Архитектура превосходства (Услуги): Креативная асимметричная сетка (Bento Grid). Напиши jQuery-скрипт: при наведении (hover) на карточку, заголовок должен на долю секунды получать эффект цифрового глитча.
4. Showcase (Интерактивная галерея проектов): Сделай горизонтальный аккордеон на jQuery. При наведении (hover) на узкую полоску с названием проекта, его карточка плавно &quot;раскрывается&quot; на всю ширину, показывая детали и фоновые изображения, а остальные сжимаются.
5. Алгоритм синтеза (Процесс): Вертикальный timeline. Через jQuery сделай так, чтобы шаги плавно загорались неоновым свечением строго в тот момент, когда пользователь доскролливает ровно до них.
6. Hall of Fame (Награды): Огромная, бесконечная текстовая бегущая строка (Marquee). С помощью jQuery привяжи анимацию к скроллу: строка должна ускоряться, когда пользователь крутит колесико мыши.
7. Ультимативный CTA: Кнопка &quot;Начать проект&quot; слегка &quot;убегает&quot; от курсора на пару пикселей при приближении мыши, а при наведении выдает мощное свечение.

ВАЖНЫЕ ТЕХНИЧЕСКИЕ ПРАВИЛА:
Напиши реалистичные и сложные jQuery скрипты в тегах &lt;script&gt; в конце HTML каждого блока, чтобы вся интерактивность реально и плавно работала. Не используй стандартные Bootstrap/Tailwind классы, пиши свой собственный уникальный премиальный CSS с использованием CSS-переменных.">🔮 Premium 3D</button>
            <button class="ts-suggestion" data-prompt="Создай премиальный SaaS лендинг для AI-платформы. Дизайн: Vercel/Linear style. Глубокий темный фон (#09090b), стеклянные карточки (rgba(255,255,255,0.03)), акценты (#22c55e или #3b82f6), тонкие бордеры, светящиеся тени. 

СТРУКТУРА И JQUERY (7 блоков):
1. Hero: Крупный заголовок, jQuery-скрипт для плавного появления элементов с задержкой (staggered fade-in) при загрузке.
2. Bento Grid Features: 6 ячеек разного размера. jQuery скрипт: при наведении мыши карточка следует за курсором легким 3D tilt-эффектом и подсвечивает бордеры (glow effect).
3. Интерактивная схема работы: jQuery табы, переключающиеся без перезагрузки с крутыми CSS-транзишенами содержимого.
4. Отзывы: Горизонтальный плавный скролл-карусель на jQuery, который можно драгать мышью.
5. Stats/Numbers: 4 крупных числа. Напиши jQuery-скрипт счетчика (count up) от 0 до числа при попадании блока в зону видимости.
6. Тарифы: 3 карточки. При выборе toggle &quot;Месяц/Год&quot; через jQuery красиво пересчитываются цены с эффектом slot-machine.
7. CTA Footer: Эффект параллакса на фоне при скролле. Обязательны крутые hover-стейты кнопок. Напиши все jQuery-скрипты встроено в HTML.">🚀 SaaS Linear</button>
            <button class="ts-suggestion" data-prompt="Создай брутальный промо-сайт для андеграундного бренда одежды (Neo-Brutalism). Стиль: сырой, дерзкий, громкая асимметрия. Цвета: агрессивный желтый (#ffd93d) фон, толстые черные контуры (4px solid #000), жесткие тени (6px 6px 0 #000). Шрифт: мега-жирный, гротеск. Никаких скруглений.

СТРУКТУРА И JQUERY АНИМАЦИИ (7 блоков):
1. Hero Title: Заголовок огромными буквами, который при движении мыши (mousemove) через jQuery «разваливается» на слои с эффектом хроматической аберрации.
2. Бегущая строка: Огромный Marquee, направление и скорость которого через jQuery жестко привязаны к скорости скролла (scroll velocity).
3. Карточки коллекции: 4 массивные карточки. jQuery скрипт: при клике на карточку она с резким звуком захлопывается как папка или откидывается в сторону.
4. Манифест (Текст): Огромный абзац текста. jQuery Intersection Observer переключает цвет текста с черного на инвертированный, пока пользователь скроллит по параграфу.
5. Draggable-элементы: Разбросанные стикеры по экрану. Реализуй на jQuery UI (или чистом jQuery+events) возможность юзеру перетаскивать их мышкой.
6. Галерея: Masonry-сетка. При наведении на картинку (hover) jQuery включает glitch-анимацию через canvas или CSS-фильтры на долю секунды.
7. Footer/Subscribe: Форма подписки. Кнопка отправки при наведении дрожит (shake) через jQuery до тех пор, пока юзер не нажмет. Опиши все jQuery скрипты детально в коде.">⚡ Neo Brutalism</button>
            <button class="ts-suggestion ts-suggestion-svg" data-prompt="Создай элитный Corporate Web-портал (Yandex/Apple style). Чистый белый фон (#ffffff), премиальный светло-серый surface (#f5f5f6), строгий черный текст. Акцент: фирменный синий (#2D7FF9). Дизайн должен дышать: огромные паддинги, выверенная типографика (system-ui), скругления 12px, мягкие глубокие тени.

СТРУКТУРА И JQUERY АНИМАЦИИ (7 блоков):
1. Hero Statement: Элегантный текст. jQuery скрипт плавно меняет ключевое слово в заголовке каждые 2 секунды (fade in/out text rotator).
2. Фичи (Sticky Scroll): Сделай секцию, где левая колонка залипает (position: sticky), а правая контентная скроллится. Через jQuery подсвечивай активный пункт меню слева в зависимости от того, какой блок справа сейчас в поле зрения.
3. Interactive Map/Stats: jQuery hover-эффекты на статистику — рисуй плавные линии соединений или увеличивай графики при наведении.
4. Экспертиза (Accordion): Профессиональный корпоративный аккордеон на jQuery. Плавное открытие/закрытие (slideUp, slideDown) деталей услуг.
5. Отзывы-карточки: 3D стеклянные карточки на белом. Через jQuery добавь легкий параллакс карточек относительно друг друга при движении курсора по секции.
6. News Feed: Горизонтальный скролл с новостями. Кнопки &quot;влево/вправо&quot; для плавной прокрутки контейнера, реализованной на jQuery (&quot;scrollLeft&quot;).
7. CTA &amp; Complex Footer: Многоуровневый футер. Напиши красивый скрипт валидации email в форме прямо на jQuery (highlight красным при ошибке, зеленая галочка при успехе).">📊 Corp Premium</button>
          </div>
        </div>
      </div>

      <!-- Settings / Animations Accordion -->
      <div class="ts-accordion-wrap">
        <button class="ts-accordion-header" type="button">
          ⚙️ Пресеты анимации
          <svg class="ts-accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div class="ts-accordion-body">
          <div class="ts-anim-header" style="margin-bottom: 12px;">
            <div class="ts-anim-presets" style="display: flex; gap: 8px;">
              <button type="button" class="ts-btn-secondary ts-anim-preset" data-preset="none" style="flex:1">Выкл</button>
              <button type="button" class="ts-btn-secondary ts-anim-preset" data-preset="light" style="flex:1">Light</button>
              <button type="button" class="ts-btn-secondary ts-anim-preset" data-preset="premium" style="flex:1">Premium</button>
            </div>
          </div>
          
          <div class="ts-anim-groups">
            <div class="ts-anim-group">
              <span class="ts-anim-group-title">Reveal</span>
              <div class="ts-checkbox-row">
                <label><input type="checkbox" class="ts-pill-checkbox ts-visually-hidden" id="ts-anim-stagger-reveal" /><span class="ts-pill-label">Cascade</span></label>
                <label><input type="checkbox" class="ts-pill-checkbox ts-visually-hidden" id="ts-anim-fade-in-up" /><span class="ts-pill-label">Fade Up</span></label>
                <label><input type="checkbox" class="ts-pill-checkbox ts-visually-hidden" id="ts-anim-zoom-in" /><span class="ts-pill-label">Zoom</span></label>
                <label><input type="checkbox" class="ts-pill-checkbox ts-visually-hidden" id="ts-anim-text-clip" /><span class="ts-pill-label">Text Clip</span></label>
              </div>
            </div>
            <div class="ts-anim-group" style="margin-top: 12px">
              <span class="ts-anim-group-title">Hover</span>
              <div class="ts-checkbox-row">
                <label><input type="checkbox" class="ts-pill-checkbox ts-visually-hidden" id="ts-anim-card-lift" /><span class="ts-pill-label">Lift</span></label>
                <label><input type="checkbox" class="ts-pill-checkbox ts-visually-hidden" id="ts-anim-glow-hover" /><span class="ts-pill-label">Glow</span></label>
                <label><input type="checkbox" class="ts-pill-checkbox ts-visually-hidden" id="ts-anim-tilt-hover" /><span class="ts-pill-label">3D Tilt</span></label>
              </div>
            </div>
            <div class="ts-anim-group" style="margin-top: 12px">
              <span class="ts-anim-group-title">Background</span>
              <div class="ts-checkbox-row">
                <label><input type="checkbox" class="ts-pill-checkbox ts-visually-hidden" id="ts-anim-parallax" /><span class="ts-pill-label">Parallax</span></label>
                <label><input type="checkbox" class="ts-pill-checkbox ts-visually-hidden" id="ts-anim-float-subtle" /><span class="ts-pill-label">Float</span></label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recorder Accordion -->
      <div class="ts-accordion-wrap">
        <button class="ts-accordion-header" type="button">
          📹 Запись действий
          <svg class="ts-accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <div class="ts-accordion-body">
          <div class="ts-recorder-wrap">
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <button class="ts-recorder-btn ts-recorder-start" id="ts-recorder-start" type="button">Start</button>
              <button class="ts-btn-secondary ts-recorder-stop" id="ts-recorder-stop" type="button" disabled style="flex:1">Stop</button>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="ts-btn-secondary" id="ts-recorder-copy" type="button" disabled style="flex:1">📋 JSON</button>
              <button class="ts-btn-secondary" id="ts-recorder-copy-steps" type="button" disabled style="flex:1">📋 Шаги</button>
            </div>
          </div>
        </div>
      </div>

      <div class="ts-actions-grid">
        <button class="ts-btn-primary" id="ts-generate">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          Создать нейро-блок
        </button>
        <button class="ts-test-btn" id="ts-test-large-blocks" type="button" style="width: auto;">🧪 7 blocks</button>
      </div>

      <!-- Секция основного лога генерации -->
      <div id="ts-agent-log"></div>

      <!-- Секция ДЛЯ ОТЛАДКИ -->
      <div class="ts-debug-section">
        <button class="ts-btn-secondary" id="ts-debug-toggle" style="width:100%">🐛 Показать лог отладки</button>
        <div class="ts-debug-log" style="display: none;" id="ts-debug-log"></div>
      </div>
    `;

    // Initialize accordions
    body.querySelectorAll('.ts-accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        header.parentElement?.classList.toggle('open');
      });
    });

    const promptEl = body.querySelector('#ts-prompt') as HTMLTextAreaElement;
    const generateBtn = body.querySelector('#ts-generate') as HTMLButtonElement;
    const testLargeBlocksBtn = body.querySelector('#ts-test-large-blocks') as HTMLButtonElement;

    // Предотвращаем перехват Tilda: буквы П (P) и С (C) и вставка ссылок.
    // stopPropagation в фазе bubble — символ успевает напечататься, событие не доходит до Tilda.
    const stopTildaShortcuts = (e: Event) => {
      const target = e.target as Node;
      const root = this.shadow;
      if (target && root.contains(target)) {
        e.stopPropagation();
      }
    };
    // Слушаем на shadow root в фазе bubble — после печати символа не даём событию дойти до document (Tilda).
    this.shadow.addEventListener('keydown', stopTildaShortcuts, false);
    this.shadow.addEventListener('keypress', stopTildaShortcuts, false);
    this.shadow.addEventListener('paste', stopTildaShortcuts, false);
    const useTemplateBtn = body.querySelector('#ts-use-as-template') as HTMLButtonElement;
    const templateStatus = body.querySelector('#ts-template-status') as HTMLDivElement;

    if (templateStatus) {
      this.updateTemplateStatus(templateStatus);
    }

    if (useTemplateBtn) {
      useTemplateBtn.addEventListener('click', () => {
        const mainContent = document.querySelector('#allrecords') || document.querySelector('.t-container') || document.querySelector('main') || document.body;
        const html = mainContent === document.body ? document.documentElement.outerHTML : mainContent.innerHTML;
        chrome.storage.local.set({ templateHtml: html }, () => {
          if (templateStatus) this.updateTemplateStatus(templateStatus);
        });
      });
    }

    const getAnimationOptions = (): AnimationOptions => ({
      staggerReveal: (body.querySelector('#ts-anim-stagger-reveal') as HTMLInputElement)?.checked ?? false,
      fadeInUp: (body.querySelector('#ts-anim-fade-in-up') as HTMLInputElement)?.checked ?? false,
      zoomIn: (body.querySelector('#ts-anim-zoom-in') as HTMLInputElement)?.checked ?? false,
      cardLift: (body.querySelector('#ts-anim-card-lift') as HTMLInputElement)?.checked ?? false,
      glowHover: (body.querySelector('#ts-anim-glow-hover') as HTMLInputElement)?.checked ?? false,
      tiltHover: (body.querySelector('#ts-anim-tilt-hover') as HTMLInputElement)?.checked ?? false,
      textClip: (body.querySelector('#ts-anim-text-clip') as HTMLInputElement)?.checked ?? false,
      parallax: (body.querySelector('#ts-anim-parallax') as HTMLInputElement)?.checked ?? false,
      floatSubtle: (body.querySelector('#ts-anim-float-subtle') as HTMLInputElement)?.checked ?? false,
    });

    const setAnimationPreset = (preset: 'none' | 'light' | 'premium') => {
      const ids = ['ts-anim-stagger-reveal', 'ts-anim-fade-in-up', 'ts-anim-zoom-in', 'ts-anim-text-clip', 'ts-anim-card-lift', 'ts-anim-glow-hover', 'ts-anim-tilt-hover', 'ts-anim-parallax', 'ts-anim-float-subtle'];
      const light = ['ts-anim-stagger-reveal', 'ts-anim-card-lift'];
      ids.forEach(id => {
        const el = body.querySelector('#' + id) as HTMLInputElement;
        if (el) el.checked = preset === 'none' ? false : preset === 'light' ? light.includes(id) : true;
      });
    };
    body.querySelectorAll('.ts-anim-preset').forEach(btn => {
      btn.addEventListener('click', () => setAnimationPreset((btn as HTMLElement).dataset.preset as 'none' | 'light' | 'premium'));
    });

    generateBtn.addEventListener('click', () => {
      const p = promptEl.value.trim();
      if (p) {
        const singleBlock = (body.querySelector('#ts-single-block') as HTMLInputElement)?.checked ?? false;
        this.runAgents(p, singleBlock, getAnimationOptions());
      }
    });

    if (testLargeBlocksBtn) {
      testLargeBlocksBtn.addEventListener('click', () => {
        this.runLargeBlockTest(getAnimationOptions());
      });
    }

    promptEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        const p = promptEl.value.trim();
        if (p) {
          const singleBlock = (body.querySelector('#ts-single-block') as HTMLInputElement)?.checked ?? false;
          this.runAgents(p, singleBlock, getAnimationOptions());
        }
      }
    });

    body.querySelectorAll('.ts-suggestion').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = (btn as HTMLElement).dataset.prompt || '';
        promptEl.value = p;
        promptEl.focus();
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

  private async startBlockAgentJobs(
    planId: string,
    designSystem: DesignSystem,
    blocks: BlockPlan[],
    animOptions: AnimationOptions
  ): Promise<Map<number, string>> {
    const jobEntries = await Promise.all(blocks.map(async (block, index) => {
      const resp = await this.sendMessage({
        type: 'START_BLOCK_AGENT',
        planId,
        designSystem,
        block,
        blockIndex: index,
        totalBlocks: blocks.length,
        animOptions,
        allBlocks: blocks,
      }) as { success: boolean; job?: BlockAgentJobSnapshot; error?: string };

      if (!resp.success || !resp.job) {
        throw new Error(resp.error || `Не удалось запустить агент блока ${index + 1}`);
      }

      return [index, resp.job.jobId] as const;
    }));

    return new Map(jobEntries);
  }

  private async getBlockAgentStatus(jobId: string): Promise<BlockAgentJobSnapshot> {
    const resp = await this.sendMessage({
      type: 'GET_BLOCK_AGENT_STATUS',
      jobId,
    }) as { success: boolean; job?: BlockAgentJobSnapshot; error?: string };

    if (!resp.success || !resp.job) {
      throw new Error(resp.error || `Не удалось получить статус job ${jobId}`);
    }

    return resp.job;
  }

  private async getBlockAgentResult(jobId: string): Promise<BlockAgentJobResult> {
    const resp = await this.sendMessage({
      type: 'GET_BLOCK_AGENT_RESULT',
      jobId,
    }) as { success: boolean; job?: BlockAgentJobResult; error?: string };

    if (!resp.success || !resp.job) {
      throw new Error(resp.error || `Не удалось получить результат job ${jobId}`);
    }

    return resp.job;
  }

  private describeBlockAgentStatus(snapshot: BlockAgentJobSnapshot): { icon: string; text: string } {
    if (snapshot.status === 'queued') {
      return { icon: '⏳', text: 'В очереди...' };
    }
    if (snapshot.status === 'streaming') {
      return { icon: '🌊', text: 'Пишу код...' };
    }
    if (snapshot.status === 'running') {
      return { icon: '🤖', text: `Агент работает (${snapshot.attempts}/${snapshot.maxRetries})...` };
    }
    if (snapshot.status === 'retrying') {
      return { icon: '🔄', text: `Повтор (${snapshot.attempts}/${snapshot.maxRetries})...` };
    }
    if (snapshot.status === 'success') {
      return { icon: '✅', text: 'Готов к вставке' };
    }
    return { icon: '❌', text: snapshot.error ? `Ошибка: ${snapshot.error}` : 'Ошибка генерации' };
  }

  private collectGeneratedHtml(): string {
    return this.generatedBlocks.filter(Boolean).join('\n\n');
  }

  private async runAgents(prompt: string, singleBlockMode = false, animOptions: AnimationOptions = { staggerReveal: false, fadeInUp: false, zoomIn: false, cardLift: false, glowHover: false, tiltHover: false, textClip: false, parallax: false, floatSubtle: false }) {
    const generateBtn = this.shadow.querySelector('#ts-generate') as HTMLButtonElement;
    const testBtn = this.shadow.querySelector('#ts-test-large-blocks') as HTMLButtonElement | null;
    generateBtn.disabled = true;
    if (testBtn) testBtn.disabled = true;
    generateBtn.textContent = '⏹ Остановить';
    generateBtn.disabled = false; // re-enable as stop button
    this.generationAborted = false;

    // Wire the button as a stop trigger
    const stopHandler = () => { this.generationAborted = true; generateBtn.textContent = '⏳ Останавливаем...'; generateBtn.disabled = true; };
    generateBtn.addEventListener('click', stopHandler, { once: true });

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
        animOptions,
      }) as { success: boolean; plan?: AgentPlan; error?: string };
      if (!planResp.success || !planResp.plan) throw new Error(planResp.error || 'Ошибка планирования');
      const plan = planResp.plan;
      this.lastPlan = { designSystem: plan.designSystem, blocks: plan.blocks, animOptions: animOptions };
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
      this.appendLog(`<div class="ts-agent-phase" style="border-left-color:#3b82f6"><div class="ts-agent-title">⚡ Генерация блоков (отдельный агент на блок)</div><div class="ts-agent-status" style="font-size:11px;color:#64748b">Запускаю изолированные block-agent job для всех блоков...</div></div>`);
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

      // Progress bar
      this.appendLog(`
        <div id="ts-progress-wrapper">
          <div class="ts-progress-text" id="ts-progress-text">0 / ${blocksToGenerate.length} блоков</div>
          <div class="ts-progress-bar"><div class="ts-progress-fill" id="ts-progress-fill" style="width:0%"></div></div>
        </div>
      `);

      const planId = crypto.randomUUID();
      const blockJobIds = await this.startBlockAgentJobs(planId, plan.designSystem, blocksToGenerate, animOptions);
      const terminalSnapshots = new Map<number, BlockAgentJobSnapshot>();
      const fetchedResults = new Set<number>();
      const completedHtmlByIndex = new Map<number, string>();
      let nextInsertIndex = 0;
      let insertQueueAnnounced = false;

      while (terminalSnapshots.size < blocksToGenerate.length) {
        const pendingIndexes = [...blockJobIds.keys()].filter((index) => !terminalSnapshots.has(index));
        const pendingSnapshots = await Promise.all(pendingIndexes.map(async (index) => {
          const snapshot = await this.getBlockAgentStatus(blockJobIds.get(index)!);
          return { index, snapshot };
        }));

        for (const { index, snapshot } of pendingSnapshots) {
          const statusInfo = this.describeBlockAgentStatus(snapshot);

          if (snapshot.status === 'streaming' && snapshot.partialHtml) {
            const codePreview = snapshot.partialHtml.length > 500
              ? snapshot.partialHtml.slice(-500)
              : snapshot.partialHtml;
            const streamingHtml = `<div class="ts-streaming-preview" style="font-family:monospace;font-size:10px;line-height:1.2;color:#10b981;white-space:pre-wrap;background:#0f172a;padding:8px;border-radius:4px;margin-top:4px;max-height:80px;overflow:hidden">${this.escapeHtml(codePreview)}<span class="ts-cursor">_</span></div>`;
            this.updateBlockStatus(index, statusInfo.icon, statusInfo.text + streamingHtml);
          } else {
            this.updateBlockStatus(index, statusInfo.icon, statusInfo.text);
          }

          if (snapshot.status === 'success' || snapshot.status === 'error') {
            terminalSnapshots.set(index, snapshot);
          }

          if (snapshot.status === 'success' && !fetchedResults.has(index)) {
            const result = await this.getBlockAgentResult(snapshot.jobId);
            if (!result.html) {
              terminalSnapshots.set(index, { ...snapshot, status: 'error', error: 'Агент завершился без HTML' });
              this.updateBlockStatus(index, '❌', 'Ошибка: агент завершился без HTML');
              continue;
            }
            fetchedResults.add(index);
            completedHtmlByIndex.set(index, result.html);
            this.generatedBlocks[index] = result.html;
            this.debugLog(`Блок ${index + 1} готов worker-agent'ом, длина: ${result.html.length}`);

            // Update progress bar
            const pct = Math.round((fetchedResults.size / blocksToGenerate.length) * 100);
            const progressFill = this.shadow.querySelector('#ts-progress-fill') as HTMLElement;
            const progressText = this.shadow.querySelector('#ts-progress-text') as HTMLElement;
            if (progressFill) progressFill.style.width = `${pct}%`;
            if (progressText) progressText.textContent = `${fetchedResults.size} / ${blocksToGenerate.length} блоков (${pct}%)`;
          }
        }

        if (!insertQueueAnnounced && completedHtmlByIndex.size > 0) {
          this.appendLog(`<div class="ts-agent-phase" style="border-left-color:#8b5cf6"><div class="ts-agent-title">📥 Ordered insert queue</div><div class="ts-agent-status" style="font-size:11px;color:#64748b">Вставляю только следующий готовый блок по порядку...</div></div>`);
          insertQueueAnnounced = true;
        }

        while (completedHtmlByIndex.has(nextInsertIndex)) {
          const html = completedHtmlByIndex.get(nextInsertIndex)!;
          const htmlPreview = html.length > 1500 ? html.slice(0, 1500) + '...[обрезано]' : html;
          this.debugLog(`--- КОД БЛОКА ${nextInsertIndex + 1} (начало) ---`);
          this.debugLog(`<pre style="margin:4px 0;font-size:10px;overflow:auto;max-height:150px">${this.escapeHtml(htmlPreview)}</pre>`);
          this.debugLog(`--- конец превью ---`);
          this.updateBlockStatus(nextInsertIndex, '📥', 'Вставляю в Tilda...');
          const inserted = await this.insertBlockIntoTilda(html, nextInsertIndex, animOptions);
          this.updateBlockStatus(nextInsertIndex, inserted ? '✅' : '📋', inserted ? 'Вставлен' : 'Скопирован', true);
          completedHtmlByIndex.delete(nextInsertIndex);
          nextInsertIndex += 1;
        }

        if (pendingIndexes.length > 0) {
          await this.wait(1200);
        }
      }

      const successfulCount = fetchedResults.size;
      this.debugLog(`Параллельная генерация завершена: ${successfulCount}/${blocksToGenerate.length} блоков`);

      const firstFailedIndex = blocksToGenerate.findIndex((_, index) => terminalSnapshots.get(index)?.status === 'error');
      if (firstFailedIndex !== -1 && nextInsertIndex <= firstFailedIndex) {
        this.appendLog(`<div class="ts-agent-phase" style="border-left-color:#ef4444"><div class="ts-agent-title">⛔ Ordered insert queue остановлена</div><div class="ts-agent-status" style="font-size:11px;color:#991b1b">Блок ${firstFailedIndex + 1} завершился ошибкой, поэтому следующие блоки не вставлялись вне очереди.</div></div>`);
      }

      // Phase 3: Publish (только если не режим "1 блок")
      const canPublish = !singleBlockMode && terminalSnapshots.size === blocksToGenerate.length && [...terminalSnapshots.values()].every((snapshot) => snapshot.status === 'success') && nextInsertIndex === blocksToGenerate.length;
      if (canPublish) {
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
      } else if (!singleBlockMode) {
        this.appendLog(`<div class="ts-agent-phase" style="border-left-color:#f59e0b"><div class="ts-agent-title">🚀 Публикация пропущена</div><div class="ts-agent-status" style="color:#92400e">Страница не опубликована автоматически: не все block-agent job завершились успешно и по порядку вставились в Tilda.</div></div>`);
      }

      // Final summary (всегда показываем)
      const readyBlocksCount = this.generatedBlocks.filter(Boolean).length;
      this.generationHistory.push({ timestamp: Date.now(), prompt, blocksCount: readyBlocksCount });
      this.appendLog(`
        <div class="ts-agent-done">
          <div style="font-size:20px;margin-bottom:8px">🎉</div>
          <div style="font-weight:700;margin-bottom:4px">${readyBlocksCount} блоков создано!</div>
          <div style="font-size:12px;color:#64748b">Генерация выполнена через отдельные block-agent job, вставка шла через ordered queue</div>
          <button class="ts-action-btn ts-btn-copy" id="ts-copy-all" style="margin-top:12px;width:100%">📋 Копировать весь HTML</button>
          <div class="ts-export-section">
            <button class="ts-export-btn" id="ts-export-html">💾 Скачать .html</button>
            <button class="ts-export-btn" id="ts-export-blocks">📦 Скачать блоки</button>
          </div>
        </div>
      `);

      const copyAllBtn = this.shadow.querySelector('#ts-copy-all');
      if (copyAllBtn) {
        copyAllBtn.addEventListener('click', () => {
          const fullHtml = this.collectGeneratedHtml();
          this.clipboardWrite(fullHtml);
          (copyAllBtn as HTMLElement).textContent = '✓ Скопировано!';
        });
      }

      // Export as single HTML file
      const exportHtmlBtn = this.shadow.querySelector('#ts-export-html');
      if (exportHtmlBtn) {
        exportHtmlBtn.addEventListener('click', () => {
          this.exportAsHtmlFile(this.collectGeneratedHtml(), 'tilda-page.html');
        });
      }

      // Export blocks as separate sections
      const exportBlocksBtn = this.shadow.querySelector('#ts-export-blocks');
      if (exportBlocksBtn) {
        exportBlocksBtn.addEventListener('click', () => {
          this.generatedBlocks.filter(Boolean).forEach((html, i) => {
            this.exportAsHtmlFile(html, `block-${i + 1}.html`);
          });
        });
      }

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (this.generationAborted) {
        this.debugLog('⏹ Генерация остановлена пользователем');
        this.appendLog(`<div class="ts-error">⏹ Генерация остановлена</div>`);
      } else {
        this.debugLog(`❌ Критическая ошибка: ${errMsg}`);
        this.appendLog(`<div class="ts-error">❌ ${errMsg}</div>`);
      }
    } finally {
      generateBtn.removeEventListener('click', stopHandler);
      generateBtn.disabled = false;
      generateBtn.textContent = '🤖 Запустить агентов';
      if (testBtn) testBtn.disabled = false;
      this.generationAborted = false;

      // Chrome notification when generation finishes
      try {
        const count = this.generatedBlocks.filter(Boolean).length;
        if (count > 0) {
          chrome.runtime.sendMessage({
            type: 'GENERATION_DONE',
            blocksCount: count,
          });
        }
      } catch (_) { /* ignore if runtime unavailable */ }
    }
  }

  private formatHtmlSize(length: number): string {
    return `${(length / 1024).toFixed(1)} KB`;
  }

  private async runLargeBlockTest(animOptions: AnimationOptions) {
    const generateBtn = this.shadow.querySelector('#ts-generate') as HTMLButtonElement | null;
    const testBtn = this.shadow.querySelector('#ts-test-large-blocks') as HTMLButtonElement | null;
    if (!testBtn || testBtn.disabled) return;

    if (generateBtn) generateBtn.disabled = true;
    testBtn.disabled = true;
    testBtn.textContent = '🧪 Готовлю большие блоки...';
    this.generatedBlocks = [];
    this.clearDebugLog();
    this.debugLog('▶ Запуск локального теста 7 больших блоков...');

    try {
      const blocks = this.createLargeTestBlocks();
      this.log(`
        <div class="ts-agent-phase done">
          <div class="ts-agent-title">🧪 Локальная проверка кода</div>
          <div class="ts-agent-status" style="color:#92400e">
            7 заранее подготовленных больших HTML-блоков без Gemini
          </div>
        </div>
      `);

      blocks.forEach((block, index) => {
        this.appendLog(`
          <div class="ts-agent-phase" id="ts-block-${index}">
            <div class="ts-agent-title">🧱 Блок ${index + 1}/${blocks.length}: ${block.type}</div>
            <div class="ts-agent-status">📄 Код подготовлен: ${this.formatHtmlSize(block.html.length)}</div>
          </div>
        `);
      });

      this.generatedBlocks = blocks.map((block) => block.html);
      this.debugLog(`Подготовлено ${blocks.length} тестовых блоков`);

      this.appendLog(`<div class="ts-agent-phase" style="border-left-color:#8b5cf6"><div class="ts-agent-title">📥 Вставка тестовых блоков в Tilda</div></div>`);

      for (let index = 0; index < blocks.length; index++) {
        const block = blocks[index];
        const sizeText = this.formatHtmlSize(block.html.length);
        this.updateBlockStatus(index, '📥', `Вставляю в Tilda... ${sizeText}`);
        this.debugLog(`Тестовый блок ${index + 1}: ${block.type}, длина ${block.html.length}`);
        const inserted = await this.insertBlockIntoTilda(block.html, index, animOptions);
        this.updateBlockStatus(index, inserted ? '✅' : '📋', inserted ? `Вставлен (${sizeText})` : `Скопирован (${sizeText})`);
      }

      this.appendLog(`
        <div class="ts-agent-done">
          <div style="font-size:20px;margin-bottom:8px">🧪</div>
          <div style="font-weight:700;margin-bottom:4px">${blocks.length} тестовых блоков готовы</div>
          <div style="font-size:12px;color:#64748b">Большой заранее подготовленный код проверен без Gemini</div>
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
      this.debugLog(`❌ Локальный тест: ${err instanceof Error ? err.message : String(err)}`);
      this.appendLog(`<div class="ts-error">❌ ${err instanceof Error ? err.message : 'Ошибка локального теста'}</div>`);
    } finally {
      if (generateBtn) generateBtn.disabled = false;
      testBtn.disabled = false;
      testBtn.textContent = '🧪 Проверка 7 больших блоков';
    }
  }

  private createLargeTestBlocks(): TestBlock[] {
    return createLargeTestBlocks(this.testBlockMinLength);
  }

  private updateBlockStatus(index: number, icon: string, text: string, showActions = false) {
    const el = this.shadow.querySelector(`#ts-block-${index}`);
    if (!el) return;
    const statusEl = el.querySelector('.ts-agent-status');
    if (!statusEl) return;

    let actionsHtml = '';
    if (showActions) {
      actionsHtml = `
        <div class="ts-block-actions">
          <button class="ts-block-action-btn" data-action="copy" data-index="${index}">📋 Копировать</button>
          <button class="ts-block-action-btn" data-action="regen" data-index="${index}">🔄 Перегенерировать</button>
          <button class="ts-block-action-btn" data-action="preview" data-index="${index}">👁 Превью</button>
          <button class="ts-block-action-btn" data-action="refine" data-index="${index}">✏ Доработать</button>
        </div>
        <div class="ts-refine-panel" id="ts-refine-panel-${index}" style="display:none; margin-top: 8px;">
          <input type="text" id="ts-refine-input-${index}" placeholder="Что изменить? (напр., 'сделай кнопку красной')" style="width:100%; padding:8px; border-radius:4px; border:1px solid #444; background:#222; color:#fff; font-size:12px; margin-bottom: 8px;" />
          <button class="ts-block-action-btn" data-action="submit-refine" data-index="${index}" style="width:100%;">Отправить</button>
        </div>
        <div class="ts-preview-panel" id="ts-preview-panel-${index}" style="display:none; margin-top: 8px; border: 1px solid #444; border-radius: 4px; overflow: hidden; background: #fff;">
          <iframe id="ts-preview-iframe-${index}" style="width: 100%; height: 300px; border: none;"></iframe>
        </div>
      `;
    }
    statusEl.innerHTML = `${icon} ${text}${actionsHtml}`;

    // Bind per-block action buttons
    if (showActions) {
      const copyBtn = statusEl.querySelector('[data-action="copy"]');
      const regenBtn = statusEl.querySelector('[data-action="regen"]');
      const previewBtn = statusEl.querySelector('[data-action="preview"]');
      const refineBtn = statusEl.querySelector('[data-action="refine"]');
      const submitRefineBtn = statusEl.querySelector('[data-action="submit-refine"]');

      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          const html = this.generatedBlocks[index];
          if (html) {
            this.clipboardWrite(html);
            (copyBtn as HTMLElement).textContent = '✓ Скопировано';
            setTimeout(() => { (copyBtn as HTMLElement).textContent = '📋 Копировать'; }, 2000);
          }
        });
      }

      if (regenBtn) {
        regenBtn.addEventListener('click', () => this.regenerateBlock(index));
      }

      if (previewBtn) {
        previewBtn.addEventListener('click', () => {
          const previewPanel = this.shadow.querySelector(`#ts-preview-panel-${index}`) as HTMLElement;
          const iframe = this.shadow.querySelector(`#ts-preview-iframe-${index}`) as HTMLIFrameElement;
          if (previewPanel && iframe) {
            if (previewPanel.style.display === 'none') {
              previewPanel.style.display = 'block';
              iframe.srcdoc = this.generatedBlocks[index] || '';
            } else {
              previewPanel.style.display = 'none';
            }
          }
        });
      }

      if (refineBtn) {
        refineBtn.addEventListener('click', () => {
          const refinePanel = this.shadow.querySelector(`#ts-refine-panel-${index}`) as HTMLElement;
          if (refinePanel) {
            refinePanel.style.display = refinePanel.style.display === 'none' ? 'block' : 'none';
          }
        });
      }

      if (submitRefineBtn) {
        submitRefineBtn.addEventListener('click', () => {
          const input = this.shadow.querySelector(`#ts-refine-input-${index}`) as HTMLInputElement;
          const instruction = input?.value.trim() || '';
          if (instruction) {
            this.regenerateBlock(index, instruction);
            const refinePanel = this.shadow.querySelector(`#ts-refine-panel-${index}`) as HTMLElement;
            if (refinePanel) refinePanel.style.display = 'none';
          }
        });
      }
    }
  }

  private sendMessage(msg: Record<string, unknown>): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (r) => resolve(r as Record<string, unknown>));
    });
  }

  private async regenerateBlock(index: number, refinementInstruction?: string): Promise<void> {
    if (!this.lastPlan) {
      this.debugLog('❌ Нет сохранённого плана для перегенерации');
      return;
    }
    const block = this.lastPlan.blocks[index];
    if (!block) {
      this.debugLog(`❌ Блок ${index} не найден в плане`);
      return;
    }

    this.updateBlockStatus(index, '🔄', 'Перегенерация...');
    this.debugLog(`🔄 Перегенерация блока ${index + 1}: ${block.type}`);

    try {
      const resp = await this.sendMessage({
        type: 'AGENT_BLOCK',
        designSystem: this.lastPlan.designSystem,
        block,
        blockIndex: index,
        totalBlocks: this.lastPlan.blocks.length,
        animOptions: this.lastPlan.animOptions,
        allBlocks: this.lastPlan.blocks,
        refinementInstruction,
      }) as { success: boolean; html?: string; error?: string };

      if (!resp.success || !resp.html) {
        throw new Error(resp.error || 'Ошибка перегенерации');
      }

      this.generatedBlocks[index] = resp.html;
      this.debugLog(`✅ Блок ${index + 1} перегенерирован, длина: ${resp.html.length}`);

      const inserted = await this.insertBlockIntoTilda(resp.html, index, this.lastPlan.animOptions);
      this.updateBlockStatus(index, inserted ? '✅' : '📋', inserted ? 'Перегенерирован и вставлен' : 'Перегенерирован', true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.debugLog(`❌ Ошибка перегенерации: ${msg}`);
      this.updateBlockStatus(index, '❌', `Ошибка: ${msg}`, true);
    }
  }

  private getStoredTemplate(): Promise<string | undefined> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['templateHtml'], (result: Record<string, string>) => {
        resolve(result.templateHtml?.trim() || undefined);
      });
    });
  }


  private exportAsHtmlFile(htmlContent: string, filename: string): void {
    exportAsHtmlFile(htmlContent, filename);
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

  // ─── Дизайнерские анимации (Tilda Zero Block) ───

  private applyAnimations(html: string, opts: AnimationOptions): string {
    return applyAnimations(html, opts);
  }

  // ─── HTML Sanitize (Tilda требует валидный HTML) ───

  private fixHtmlForTilda(html: string): string {
    return fixHtmlForTilda(html);
  }

  private async processImagesInHtml(html: string): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const imgs = doc.querySelectorAll('img');
    const elementsWithBg = doc.querySelectorAll('[style*="background-image"]');

    const toUpload: { url: string; element: HTMLElement; attr: string }[] = [];

    imgs.forEach((img) => {
      const src = img.getAttribute('src');
      if (src && !src.includes('tildacdn.com')) {
        toUpload.push({ url: src, element: img, attr: 'src' });
      }
    });

    elementsWithBg.forEach((el) => {
      const style = el.getAttribute('style') || '';
      const match = style.match(/background-image:\s*url\(['"]?(.*?)['"]?\)/);
      if (match && match[1] && !match[1].includes('tildacdn.com')) {
        toUpload.push({ url: match[1], element: el as HTMLElement, attr: 'background-image' });
      }
    });

    if (toUpload.length === 0) return html;

    this.debugLog(`Найдено ${toUpload.length} изображений для загрузки в Tilda CDN...`);

    // Get upload params from Tilda page
    const paramsResp = await this.sendMessage({ type: 'GET_TILDA_UPLOAD_PARAMS' }) as { success: boolean; params?: TildaUploadParams; error?: string };
    if (!paramsResp.success || !paramsResp.params) {
      this.debugLog(`⚠️ Не удалось получить ключи загрузки: ${paramsResp.error || 'неизвестная ошибка'}. Использую оригинальные ссылки.`);
      return html;
    }

    const { params } = paramsResp;

    for (const item of toUpload) {
      try {
        this.debugLog(`Загружаю: ${item.url.slice(0, 50)}...`);
        const filename = item.url.split('/').pop()?.split('?')[0] || 'image.png';
        const uploadResp = await this.sendMessage({
          type: 'UPLOAD_IMAGE_TO_TILDA',
          blobUrl: item.url,
          filename,
          params
        }) as unknown as TildaUploadResponse;

        if (uploadResp.success && uploadResp.url) {
          if (item.attr === 'src') {
            item.element.setAttribute('src', uploadResp.url);
          } else {
            const oldStyle = item.element.getAttribute('style') || '';
            const newStyle = oldStyle.replace(/background-image:\s*url\(['"]?(.*?)['"]?\)/, `background-image: url("${uploadResp.url}")`);
            item.element.setAttribute('style', newStyle);
          }
          this.debugLog(`✓ Загружено: ${uploadResp.url}`);
        } else {
          this.debugLog(`❌ Ошибка загрузки "${item.url}": ${uploadResp.error}`);
        }
      } catch (e) {
        this.debugLog(`❌ Исключение при загрузке "${item.url}": ${e}`);
      }
    }

    return doc.body.innerHTML;
  }

  // ─── Tilda Insertion ───

  private async insertBlockIntoTilda(html: string, blockIndex = 0, animOptions?: AnimationOptions): Promise<boolean> {
    this.debugLog(`Начинаю вставку блока ${blockIndex + 1}...`);
    try {
      if (blockIndex > 0) await this.wait(600);

      // --- NEW: Process and upload images before insertion ---
      this.updateBlockStatus(blockIndex, '🖼️', 'Обработка изображений...');
      const processedHtml = await this.processImagesInHtml(html);
      // --------------------------------------------------------

      let processed = this.fixHtmlForTilda(processedHtml);
      const hasAnim = animOptions && (animOptions.staggerReveal || animOptions.fadeInUp || animOptions.zoomIn || animOptions.cardLift || animOptions.glowHover || animOptions.tiltHover || animOptions.textClip || animOptions.parallax || animOptions.floatSubtle);
      if (hasAnim) {
        processed = this.applyAnimations(processed, animOptions);
      }
      const fixed = processed;
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
      await this.wait(blockIndex > 0 ? 2200 : 1500);
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
      await this.wait(blockIndex > 0 ? 800 : 500);

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

      const targetRecId = newBlockEl?.id || '';
      const targetRecNum = targetRecId.match(/^rec(\d+)$/)?.[1] || '';

      const activateBlockByMouse = async (blockEl: HTMLElement): Promise<void> => {
        blockEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        await this.wait(blockIndex >= 5 ? 1200 : 900);
        const rect = blockEl.getBoundingClientRect();
        const x = Math.round(rect.left + rect.width / 2);
        const y = Math.round(rect.top + Math.min(rect.height / 2, 80));
        const evt = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
        blockEl.dispatchEvent(new MouseEvent('mouseover', evt));
        blockEl.dispatchEvent(new MouseEvent('mousemove', evt));
        this.safeClick(blockEl);
        this.debugLog(`Мышиный клик по блоку ${blockEl.id}`);
        await this.wait(550);
      };

      const getVisibleContentBtn = (doc: Document): HTMLElement | null => {
        const roots: ParentNode[] = [];
        if (targetRecNum) {
          const recNode = doc.getElementById(`record${targetRecNum}`);
          if (recNode) roots.push(recNode);
        }
        const hovered = doc.querySelector('.tp-record-ui.tp-record-ui_hovered');
        if (hovered && !roots.includes(hovered)) roots.push(hovered);
        roots.push(doc);

        // Force UI reveal by simulating mouseenter on the record container
        if (targetRecNum) {
          const recNode = doc.getElementById(`record${targetRecNum}`);
          if (recNode) {
            const uiNode = recNode.querySelector('.tp-record-ui') || document.querySelector(`#record${targetRecNum} + .tp-record-ui`) || document.querySelector(`[data-record-id="${targetRecNum}"] .tp-record-ui`);
            if (uiNode) {
              uiNode.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
            }
            recNode.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true }));
            recNode.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true }));
          }
        }

        for (const root of roots) {
          const elements = Array.from(root.querySelectorAll('.tp-record-ui__button_primary, .tp-record-edit-button, button, a, div, span'));
          for (const el of elements) {
            const t = (el as HTMLElement).innerText?.trim();
            if (t === 'Контент' || t === 'контент' || t === 'Content' || t === 'CONTENT') {
              // Ignore bounding rect as it might be display:none but we still need to click it via JS if possible
              return el as HTMLElement;
            }
          }
        }
        return null;
      };

      const waitVisibleFormbox = async (): Promise<HTMLElement | null> => this.waitForInAny((doc) => {
        for (const fb of doc.querySelectorAll('[id^="formbox"]')) {
          const r = (fb as HTMLElement).getBoundingClientRect();
          if (r.width > 10 && r.height > 10) return fb as HTMLElement;
        }
        return null;
      }, blockIndex >= 5 ? 3500 : 2500);

      if (newBlockEl && blockIndex > 0) {
        await activateBlockByMouse(newBlockEl);
      } else if (blockIndex > 0) {
        this.debugLog('⚠ Новый блок не найден — откроется блок 1');
      }

      // Для блоков 2+ открываем ТОЛЬКО их formboxNNN, иначе выходим с ошибкой (без перезаписи других блоков).
      this.debugLog('Жду кнопку "Контент"...');
      let targetFormboxOpened = false;
      if (blockIndex > 0 && newBlockEl && targetRecNum) {
        for (let attempt = 1; attempt <= 3; attempt++) {
          const contentBtn = await this.waitForInAny((doc) => getVisibleContentBtn(doc), 2200);
          if (!contentBtn) {
            this.debugLog(`Контент не найден (попытка ${attempt}/3), реактивирую блок`);
            await activateBlockByMouse(newBlockEl);
            continue;
          }
          this.debugLog(`Кликаю "Контент" (попытка ${attempt}/3)`);
          (contentBtn as HTMLElement).scrollIntoView({ block: 'center' });
          await this.wait(120);
          this.safeClick(contentBtn);

          const fb = await waitVisibleFormbox();
          if (fb && fb.id === `formbox${targetRecNum}`) {
            this.debugLog(`Открыт целевой formbox ${fb.id}`);
            targetFormboxOpened = true;
            break;
          }

          if (fb) this.debugLog(`⚠ Открылся не тот formbox (${fb.id}), нужен formbox${targetRecNum}`);
          document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, bubbles: true }));
          await this.wait(550);
          await activateBlockByMouse(newBlockEl);
        }
        if (!targetFormboxOpened) {
          this.debugLog(`❌ Не удалось открыть formbox${targetRecNum} для ${targetRecId}`);
          return false;
        }
      } else {
        // Для первого блока разрешаем обычный поток.
        const contentBtn = await this.waitForInAny((doc) => getVisibleContentBtn(doc), 3500);
        if (!contentBtn) { this.debugLog('❌ Кнопка "Контент" не найдена'); return false; }
        this.debugLog('Кликаю "Контент"');
        (contentBtn as HTMLElement).scrollIntoView({ block: 'center' });
        await this.wait(120);
        this.safeClick(contentBtn);
        await this.wait(blockIndex >= 5 ? 2500 : 2000);
      }

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

  private injectAceSetValue(doc: Document, _el: HTMLElement, html: string): boolean {
    try {
      const safeHtml = JSON.stringify(html).replace(/<\/(script)/gi, '<\\/$1');
      const script = doc.createElement('script');
      script.textContent = `(function(){
        var all = document.querySelectorAll('.ace_editor');
        var el = all.length > 0 ? all[all.length - 1] : null;
        if (!el) return false;
        var h = ${safeHtml};
        if (el.aceEditor && el.aceEditor.setValue) {
          el.aceEditor.setValue(h);
          return true;
        }
        if (el.env && el.env.editor && el.env.editor.setValue) {
          el.env.editor.setValue(h);
          return true;
        }
        if (typeof ace !== 'undefined' && ace.edit) {
          var ed = ace.edit(el);
          if (ed && ed.setValue) { ed.setValue(h); return true; }
        }
        var pres = document.querySelectorAll('pre[id^="aceeditor"]');
        var pre = pres.length > 0 ? pres[pres.length - 1] : null;
        if (pre && pre.id && typeof ace !== 'undefined') {
          var e = ace.edit(pre.id);
          if (e && e.setValue) { e.setValue(h); return true; }
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

  private wait(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async clipboardWrite(text: string) {
    return clipboardWrite(text);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TildaSpaceAI());
} else {
  new TildaSpaceAI();
}
