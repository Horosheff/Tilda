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

interface AnimationOptions {
  staggerReveal: boolean;
  fadeInUp: boolean;
  zoomIn: boolean;
  cardLift: boolean;
  glowHover: boolean;
  tiltHover: boolean;
  textClip: boolean;
  parallax: boolean;
  floatSubtle: boolean;
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

interface TestBlock {
  type: string;
  html: string;
}

type BlockAgentJobStatus = 'queued' | 'running' | 'retrying' | 'success' | 'error';

interface BlockAgentJobSnapshot {
  jobId: string;
  planId?: string;
  blockIndex: number;
  blockType: string;
  status: BlockAgentJobStatus;
  attempts: number;
  maxRetries: number;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  nextRetryAt?: number;
  error?: string;
}

interface BlockAgentJobResult extends BlockAgentJobSnapshot {
  html?: string;
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
  private readonly testBlockMinLength = 2500;

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
    this.setupRuntimeHandlers();
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
        <div class="ts-header-copy">
          <div class="ts-header-badge">AI page system</div>
          <h2>Tilda Space AI</h2>
          <div class="ts-header-meta">Генерация блоков, ordered insert и тесты прямо внутри редактора</div>
        </div>
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
    body.innerHTML = `
      <div class="ts-no-key">
        <div class="ts-empty-state">
          <div class="ts-header-badge">Setup required</div>
          <h3>Сначала подключи Gemini API</h3>
          <p>После сохранения ключа панель откроет генерацию блоков, SVG-инструменты, тест 7 больших секций и вставку в Tilda по очереди.</p>
          <div class="ts-empty-actions">
            <button class="ts-btn-open">Открыть настройки</button>
          </div>
        </div>
      </div>
    `;
    body.querySelector('.ts-btn-open')!.addEventListener('click', () => chrome.runtime.sendMessage({ type: 'OPEN_POPUP' }));
  }

  private renderPromptUI() {
    const body = this.getBody();
    body.innerHTML = `
      <div class="ts-hero-card">
        <div class="ts-hero-badge">Parallel block agents</div>
        <div class="ts-hero-title">Собирай страницу как продакшн-сценарий, а не как набор случайных кнопок</div>
        <div class="ts-hero-text">Один orchestrator проектирует страницу, дальше отдельный агент генерирует каждый блок, а вставка в Tilda идёт строго по порядку.</div>
        <div class="ts-hero-metrics">
          <div class="ts-metric"><strong>1</strong><span>общий дизайн-план страницы</span></div>
          <div class="ts-metric"><strong>N</strong><span>отдельных block-agent job</span></div>
          <div class="ts-metric"><strong>Queue</strong><span>ordered insert без ломания структуры</span></div>
        </div>
      </div>

      <div class="ts-section">
        <div class="ts-section-head">
          <div class="ts-section-title">Бриф страницы</div>
          <div class="ts-section-subtitle">Опиши оффер, стиль и блоки. Панель сохранит единый tone of voice и соберёт страницу в одной системе.</div>
        </div>
        <div class="ts-prompt-area">
          <textarea id="ts-prompt" placeholder="Опишите сайт, который нужно создать...&#10;&#10;Например: premium лендинг для AI-сервиса, hero + benefits + cases + FAQ + CTA, строгий dark tech стиль."></textarea>
        </div>
        <div class="ts-template-row" style="display: none;">
          <button class="ts-template-btn" id="ts-use-as-template" type="button">📄 Использовать эту страницу как шаблон</button>
          <div class="ts-template-status" id="ts-template-status"></div>
        </div>
        <div class="ts-mode-row">
          <label class="ts-mode-label">
            <input type="checkbox" id="ts-single-block" />
            <span>Только 1 блок для быстрого прогона и локальной проверки цепочки</span>
          </label>
        </div>
      </div>

      <div class="ts-anim-row">
        <div class="ts-section-head">
          <div class="ts-section-title">Анимации и visual hints</div>
          <div class="ts-section-subtitle">Это не отдельный конструктор эффектов, а подсказки для агентов, чтобы они строили блоки под нужный визуальный ритм.</div>
        </div>
        <div class="ts-anim-header">
          <span class="ts-anim-title">Пресеты анимаций</span>
          <div class="ts-anim-presets">
            <button type="button" class="ts-anim-preset" data-preset="none">Выкл</button>
            <button type="button" class="ts-anim-preset" data-preset="light">Лёгкие</button>
            <button type="button" class="ts-anim-preset" data-preset="premium">Премиум</button>
          </div>
        </div>
        <div class="ts-anim-group">
          <span class="ts-anim-group-title">Появление при скролле</span>
          <div class="ts-anim-checks">
            <label class="ts-anim-label" title="Элементы появляются каскадом с задержкой"><input type="checkbox" id="ts-anim-stagger-reveal" /><span>Каскад (stagger)</span></label>
            <label class="ts-anim-label" title="Появление снизу вверх"><input type="checkbox" id="ts-anim-fade-in-up" /><span>Fade In Up</span></label>
            <label class="ts-anim-label" title="Увеличение при появлении на экране"><input type="checkbox" id="ts-anim-zoom-in" /><span>Zoom In</span></label>
            <label class="ts-anim-label" title="Заголовки раскрываются слева направо"><input type="checkbox" id="ts-anim-text-clip" /><span>Text clip reveal</span></label>
          </div>
        </div>
        <div class="ts-anim-group">
          <span class="ts-anim-group-title">Hover-эффекты</span>
          <div class="ts-anim-checks">
            <label class="ts-anim-label" title="Карточки приподнимаются с тенью"><input type="checkbox" id="ts-anim-card-lift" /><span>Card lift</span></label>
            <label class="ts-anim-label" title="Свечение акцентного цвета"><input type="checkbox" id="ts-anim-glow-hover" /><span>Glow</span></label>
            <label class="ts-anim-label" title="Лёгкий 3D наклон при наведении"><input type="checkbox" id="ts-anim-tilt-hover" /><span>Tilt 3D</span></label>
          </div>
        </div>
        <div class="ts-anim-group">
          <span class="ts-anim-group-title">Фоновые эффекты</span>
          <div class="ts-anim-checks">
            <label class="ts-anim-label" title="Смещение слоёв при прокрутке"><input type="checkbox" id="ts-anim-parallax" /><span>Параллакс</span></label>
            <label class="ts-anim-label" title="Лёгкое покачивание элементов"><input type="checkbox" id="ts-anim-float-subtle" /><span>Float</span></label>
          </div>
        </div>
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

      <div class="ts-svg-row">
        <span class="ts-svg-title">🎨 SVG генератор</span>
        <div class="ts-svg-section">
          <label class="ts-svg-label">Иконка (24–48px)</label>
          <input type="text" id="ts-svg-icon-prompt" placeholder="Опишите иконку" class="ts-svg-input" />
          <button type="button" id="ts-svg-icon-btn" class="ts-svg-btn">Генерировать иконку</button>
        </div>
        <div class="ts-svg-section">
          <label class="ts-svg-label">Большая анимация</label>
          <input type="text" id="ts-svg-anim-prompt" placeholder="Опишите анимацию" class="ts-svg-input" />
          <button type="button" id="ts-svg-anim-btn" class="ts-svg-btn">Генерировать анимацию</button>
        </div>
        <div class="ts-svg-result" id="ts-svg-result" style="display:none">
          <div class="ts-svg-preview" id="ts-svg-preview"></div>
          <button type="button" id="ts-svg-copy" class="ts-svg-copy">📋 Копировать SVG</button>
        </div>
      </div>
      <div class="ts-generate-actions">
        <button class="ts-generate-btn" id="ts-generate">🤖 Запустить агентов</button>
        <button class="ts-test-btn" id="ts-test-large-blocks" type="button">🧪 Проверка 7 больших блоков</button>
      </div>
      <div class="ts-suggestions">
        <p>ГОТОВЫЕ СЦЕНАРИИ · 2026</p>
        <button class="ts-suggestion ts-suggestion-kvai" data-prompt="Лендинг AI-сервиса. Блоки: hero (градиент #694be8→#8167f0, заголовок + CTA), 3–4 карточки преимуществ, тарифы с иконками и ценами, FAQ аккордеон, отзывы 3 шт, CTA, footer. Design system: primary #694be8, accent #e9cc57, bg #0f0f14, text #fff. Border-radius 12px, padding 24px. Premium, конверсионный.">🔮 KV-AI Premium</button>
        <button class="ts-suggestion" data-prompt="Bento Grid SaaS. Блоки: hero (заголовок + subline), bento-сетка 6–8 модулей разного размера (крупный 2x2, средние 1x2, мелкие 1x1) — каждый модуль: иконка + заголовок + 1 строка текста. Feature showcase, CTA, footer. Цвета: bg #0a0a0a, card #18181b, accent #3b82f6, text #fafafa. Gap 16px, border-radius 16px. Минимум текста, визуальная иерархия через размер ячеек.">📦 Bento Grid SaaS</button>
        <button class="ts-suggestion" data-prompt="Neo-Brutalism лендинг. Блоки: hero, 3 features в карточках, отзывы, CTA, footer. Ключевое: каждая карточка и кнопка — border: 4px solid #000, box-shadow: 6px 6px 0 #000. Цвета: жёлтый #ffd93d фон карточек, чёрный #000 текст и рамки, белый #fff фон секций. Типография: жирная 700+, без скруглений (border-radius: 0). Асимметрия в layout. Raw, bold, Gen Z aesthetic.">⚡ Neo-Brutalism</button>
        <button class="ts-suggestion" data-prompt="Glassmorphism лендинг. Блоки: hero (фон тёмный градиент, контент поверх), features в полупрозрачных карточках (background: rgba(255,255,255,0.1), border: 1px solid rgba(255,255,255,0.2)), тарифы, CTA, footer. Цвета: bg #1e293b, accent #818cf8, text #f1f5f9. Карточки с лёгкой тенью. Утончённый, слоёный.">🪟 Glassmorphism</button>
        <button class="ts-suggestion" data-prompt="Earth Tones лендинг. Блоки: hero, преимущества 3–4, о компании, отзывы, CTA, footer. Цвета: primary #8B7355, secondary #D4A574, bg #faf8f5, text #2d2a26. Тёплые оттенки, много padding 40–60px, line-height 1.6. Шрифты читаемые, воздух между секциями. Человечность, доверие, grounding.">🌿 Earth Tones</button>
        <button class="ts-suggestion" data-prompt="Dark Tech лендинг (Linear/Vercel style). Блоки: hero с крупной типографикой (48px+), features минималистично 3 колонки, тарифы компактно, CTA, footer. Цвета: bg #09090b, surface #18181b, accent #22c55e или #a855f7, text #a1a1aa. Border-radius 8px. Никакого декора, только контент. Скорость, чистота, premium.">🚀 Dark Tech</button>
        <button class="ts-suggestion" data-prompt="Креативное агентство. Блоки: hero крупный заголовок + субтитр, галерея работ 6 карточек (2x3) с hover-эффектом, услуги 4 с иконками, о команде 2–3 человека, контакты + CTA, footer. Цвета: bg #fff, accent #f97316, text #0f0f0f. Типография: заголовки 700–800, размер 36–48px. Смелый, креативный.">🎨 Креатив-агентство</button>
        <button class="ts-suggestion" data-prompt="Лендинг кофейни. Блоки: hero с крупным фото (800px height), меню 3 категории (напитки, десерты, завтраки), о нас, галерея 4 фото, отзывы, контакты + карта, footer. Цвета: primary #6F4E37, bg #FFF8F0, accent #8B4513. Шрифты: основной читаемый, заголовки можно cursive для атмосферы. Уют, тепло.">☕ Кофейня</button>
        <button class="ts-suggestion" data-prompt="Лендинг фитнес-клуба. Блоки: hero с мотивационным заголовком, направления 4–6 карточек (тренажёрка, йога, групповые и т.д.), тренеры 3 с фото и именем, тарифы 3 плана, отзывы, CTA, footer. Цвета: bg #f8fafc, accent #f97316 или #ef4444, text #1e293b. Динамика, контраст, энергия.">💪 Фитнес</button>
        <button class="ts-suggestion ts-suggestion-yandex" data-prompt="Yandex Metrika Style (по образцу yandex.ru/adv/metrika). Design system: bg #ffffff, bgAlt #f5f5f6, primary #2D7FF9 (Yandex blue), text #000000, textMuted #666666, font Yandex Sans / -apple-system / system-ui. Hero: H1 крупный 40–48px + subline + CTA-кнопка «Создать»/«Начать» + stat-badge (например «95% используют»). Feature-duo: 2 большие карточки 50/50 — иконка 32px + заголовок H3 + 2–3 строки текста. Grid «Возможности»: 5–6 карточек-ссылок в сетке — иконка + заголовок + 1 строка. Stats: 3 крупных числа (9 млн, 1.6 млн, 120) + подписи в ряд. News: 3 карточки — дата + заголовок + excerpt + «Подробнее». Promo-block: тёмный контрастный блок (bg #1a1a1a), title + описание + CTA «Подробнее». «Читайте также»: 6–8 карточек статей — thumbnail, заголовок, дата, excerpt, тег. FAQ «С чего начать»: accordion 4–5 вопросов. CTA: 2 кнопки рядом. Footer: 3 быстрые ссылки (иконка+текст) + колонки. Карточки: border-radius 12px, box-shadow: 0 2px 8px rgba(0,0,0,0.08), padding 24px. Кнопки: primary filled #2D7FF9, secondary outline. Никаких тяжёлых градиентов — чистый корпоративный стиль.">📊 Yandex Metrika Style</button>
        <button class="ts-suggestion ts-suggestion-svg" data-prompt="Лендинг с настоящими SVG-анимациями. ВСЕ иконки — inline SVG с <animate>, <animateTransform> (движение, морфинг, пульсация). Hero: крупный анимированный SVG — движущиеся формы, градиенты. Карточки: у каждой анимированная SVG-иконка. Фоновые декорации: анимированные волны, круги. Цвета подбирай сам под единый стиль. Минимум 5–6 уникальных SVG-анимаций.">🎨 SVG Animated</button>
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

    this.updateTemplateStatus(templateStatus);

    useTemplateBtn.addEventListener('click', () => {
      const mainContent = document.querySelector('#allrecords') || document.querySelector('.t-container') || document.querySelector('main') || document.body;
      const html = mainContent === document.body ? document.documentElement.outerHTML : mainContent.innerHTML;
      chrome.storage.local.set({ templateHtml: html }, () => this.updateTemplateStatus(templateStatus));
    });

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

    // SVG генератор
    let lastSvg = '';
    const svgIconPrompt = body.querySelector('#ts-svg-icon-prompt') as HTMLInputElement;
    const svgAnimPrompt = body.querySelector('#ts-svg-anim-prompt') as HTMLInputElement;
    const svgIconBtn = body.querySelector('#ts-svg-icon-btn');
    const svgAnimBtn = body.querySelector('#ts-svg-anim-btn');
    const svgResult = body.querySelector('#ts-svg-result') as HTMLElement;
    const svgPreview = body.querySelector('#ts-svg-preview') as HTMLElement;
    const svgCopyBtn = body.querySelector('#ts-svg-copy');
    const runSvgGen = async (type: 'icon' | 'anim') => {
      const prompt = type === 'icon' ? svgIconPrompt?.value?.trim() : svgAnimPrompt?.value?.trim();
      if (!prompt) return;
      const btn = type === 'icon' ? svgIconBtn : svgAnimBtn;
      if (btn) { (btn as HTMLButtonElement).disabled = true; (btn as HTMLButtonElement).textContent = '…'; }
      try {
        const resp = await this.sendMessage({
          type: type === 'icon' ? 'GENERATE_SVG_ICON' : 'GENERATE_SVG_ANIMATION',
          prompt,
          size: type === 'icon' ? 48 : undefined,
        }) as { success: boolean; svg?: string; error?: string };
        if (resp.success && resp.svg) {
          lastSvg = resp.svg;
          if (svgResult) svgResult.style.display = 'block';
          if (svgPreview) {
            svgPreview.innerHTML = '';
            const wrap = document.createElement('div');
            wrap.style.cssText = 'padding:16px;background:#f8fafc;border-radius:8px;display:flex;align-items:center;justify-content:center;min-height:80px;';
            wrap.innerHTML = resp.svg;
            const svgEl = wrap.querySelector('svg');
            if (svgEl && type === 'anim') { svgEl.setAttribute('width', '200'); svgEl.setAttribute('height', '150'); }
            else if (svgEl && type === 'icon') { svgEl.setAttribute('width', '48'); svgEl.setAttribute('height', '48'); }
            svgPreview.appendChild(wrap);
          }
        } else {
          this.debugLog(`SVG ошибка: ${resp.error || 'unknown'}`);
        }
      } finally {
        if (btn) { (btn as HTMLButtonElement).disabled = false; (btn as HTMLButtonElement).textContent = type === 'icon' ? 'Генерировать иконку' : 'Генерировать анимацию'; }
      }
    };
    if (svgIconBtn) svgIconBtn.addEventListener('click', () => runSvgGen('icon'));
    if (svgAnimBtn) svgAnimBtn.addEventListener('click', () => runSvgGen('anim'));
    if (svgCopyBtn) svgCopyBtn.addEventListener('click', () => {
      if (lastSvg) navigator.clipboard.writeText(lastSvg).then(() => { (svgCopyBtn as HTMLButtonElement).textContent = '✓ Скопировано'; setTimeout(() => { (svgCopyBtn as HTMLButtonElement).textContent = '📋 Копировать SVG'; }, 1500); });
    });
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
        animOptions,
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
          this.updateBlockStatus(index, statusInfo.icon, statusInfo.text);

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
          this.updateBlockStatus(nextInsertIndex, inserted ? '✅' : '📋', inserted ? 'Вставлен' : 'Скопирован');
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
      this.appendLog(`
        <div class="ts-agent-done">
          <div style="font-size:20px;margin-bottom:8px">🎉</div>
          <div style="font-weight:700;margin-bottom:4px">${readyBlocksCount} блоков создано!</div>
          <div style="font-size:12px;color:#64748b">Генерация выполнена через отдельные block-agent job, вставка шла через ordered queue</div>
          <button class="ts-action-btn ts-btn-copy" id="ts-copy-all" style="margin-top:12px;width:100%">📋 Копировать весь HTML</button>
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

    } catch (err) {
      this.debugLog(`❌ Критическая ошибка: ${err instanceof Error ? err.message : String(err)}`);
      this.appendLog(`<div class="ts-error">❌ ${err instanceof Error ? err.message : 'Ошибка'}</div>`);
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = '🤖 Запустить агентов';
      if (testBtn) testBtn.disabled = false;
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
    const palette = {
      primary: '#694be8',
      secondary: '#8167f0',
      accent: '#e9cc57',
      light: '#f8f7ff',
      dark: '#17132b',
      text: '#120f26',
      muted: '#6b6784'
    };

    const metricCards = [
      ['14 мин', 'Среднее время от идеи до первой версии страницы'],
      ['7 блоков', 'Полный тестовый сценарий для вставки по порядку'],
      ['0 ручных правок', 'Когда структура и стиль попадают в ожидание с первой попытки']
    ];

    const featureCards = [
      ['AI-стратегия', 'Собирает структуру страницы, тезисы и акценты под конкретный оффер за один прогон.'],
      ['SVG и анимации', 'Добавляет иконки, glow-эффекты, мягкие hover-сценарии и аккуратную глубину интерфейса.'],
      ['Tilda-ready HTML', 'На выходе получается код, который удобно вставлять блоками и сразу проверять в редакторе.'],
      ['Сценарии промптов', 'Можно быстро переключаться между кейсами: SaaS, агентства, портфолио, продукты и лендинги.'],
      ['Единая дизайн-система', 'Цвета, радиусы, тени и типографика живут в одном наборе и не расползаются между секциями.'],
      ['Поток тестирования', 'Проверочный режим помогает быстро гонять длинные HTML-блоки без вызовов Gemini API.']
    ];

    const cases = [
      ['EdTech-платформа', 'Собрали hero, сетку преимуществ, кейсы преподавателей и CTA для демо-записи.'],
      ['B2B SaaS', 'Сделали плотный enterprise-лендинг с метриками, сравнением сценариев и FAQ.'],
      ['Агентство', 'Подняли дорогую подачу с сильным оффером, процессом работы и витриной кейсов.'],
      ['AI-продукт', 'Отдельно протестировали длинные кодовые блоки для устойчивой вставки в Tilda.']
    ];

    const steps = [
      ['01', 'Бриф и контекст', 'Сначала задаём бизнес-задачу, тональность, аудиторию и визуальный референс.'],
      ['02', 'План страницы', 'Оркестратор разбивает страницу на блоки, чтобы каждый агент работал по точному ТЗ.'],
      ['03', 'Генерация HTML', 'Каждый блок получает крупный, подробный и вставляемый код без пустых заглушек.'],
      ['04', 'Вставка и проверка', 'Сравниваем объём кода, тестируем вставку, оцениваем визуальный результат в Tilda.']
    ];

    const faqs = [
      ['Зачем нужен режим проверки?', 'Он позволяет быстро проверить вставку больших HTML-блоков без ожидания ответа от модели и без расхода токенов.'],
      ['Почему именно 7 блоков?', 'Это удобный полный сценарий страницы: hero, доверие, возможности, кейсы, процесс, FAQ и финальный CTA.'],
      ['Что значит "большой код"?', 'Мы специально делаем плотный HTML с карточками, списками, метриками и вложенной структурой, чтобы стресс-тест был ближе к реальной генерации.'],
      ['Можно ли эти блоки вставлять в Tilda?', 'Да, они вставляются так же, как обычные результаты генерации: по одному блоку в стандартный пайплайн.']
    ];

    const heroHtml = `
<section style="padding:96px 0;background:radial-gradient(circle at top left, rgba(233,204,87,0.30), transparent 24%), linear-gradient(135deg, ${palette.dark} 0%, #231c45 52%, ${palette.primary} 100%);font-family:Inter,system-ui,sans-serif;color:#ffffff;box-sizing:border-box;">
  <div style="max-width:1200px;margin:0 auto;padding:0 20px;">
    <div style="display:grid;grid-template-columns:1.15fr 0.85fr;gap:32px;align-items:center;">
      <div>
        <div style="display:inline-flex;align-items:center;gap:10px;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,0.10);border:1px solid rgba(255,255,255,0.18);font-size:13px;font-weight:700;letter-spacing:0.02em;text-transform:uppercase;">
          <span style="width:9px;height:9px;border-radius:50%;background:${palette.accent};box-shadow:0 0 18px rgba(233,204,87,0.8);display:inline-block;"></span>
          Локальная проверка 7 больших блоков
        </div>
        <h1 style="font-size:64px;line-height:1.02;font-weight:800;letter-spacing:-0.04em;margin:22px 0 18px;max-width:760px;">Проверяем длинный HTML-код так, будто страница уже готова к продакшену.</h1>
        <p style="font-size:20px;line-height:1.7;color:rgba(255,255,255,0.82);max-width:720px;margin:0 0 28px;">Этот hero создан специально для стресс-теста: длинные строки, вложенные сетки, большие карточки, насыщенная типографика и несколько слоёв декоративных элементов. Если такой блок стабильно вставляется в Tilda, значит и реальные большие генерации будут проходить заметно спокойнее.</p>
        <div style="display:flex;flex-wrap:wrap;gap:14px;margin-bottom:30px;">
          <a href="#" style="display:inline-flex;align-items:center;justify-content:center;padding:16px 30px;border-radius:14px;background:${palette.accent};color:${palette.text};font-weight:800;text-decoration:none;box-shadow:0 18px 40px rgba(233,204,87,0.28);transition:all .3s ease;">Проверить вставку</a>
          <a href="#" style="display:inline-flex;align-items:center;justify-content:center;padding:16px 30px;border-radius:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);color:#fff;font-weight:700;text-decoration:none;transition:all .3s ease;">Скопировать код блока</a>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;">
          ${metricCards.map(([value, label]) => `
            <div style="padding:18px;border-radius:18px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);backdrop-filter:blur(14px);">
              <div style="font-size:28px;font-weight:800;margin-bottom:6px;">${value}</div>
              <div style="font-size:14px;line-height:1.5;color:rgba(255,255,255,0.74);">${label}</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div>
        <div style="position:relative;padding:24px;border-radius:28px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);box-shadow:0 30px 60px rgba(0,0,0,0.24);overflow:hidden;">
          <div style="position:absolute;inset:auto -60px -80px auto;width:220px;height:220px;background:radial-gradient(circle, rgba(233,204,87,0.45), transparent 70%);"></div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
            <div>
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:rgba(255,255,255,0.55);margin-bottom:6px;">Prepared code monitor</div>
              <div style="font-size:22px;font-weight:800;">Block size dashboard</div>
            </div>
            <div style="padding:10px 14px;border-radius:999px;background:rgba(233,204,87,0.18);color:${palette.accent};font-size:12px;font-weight:800;">READY</div>
          </div>
          <div style="display:grid;gap:12px;">
            ${['Hero block / 5.4 KB', 'Features block / 6.1 KB', 'Cases block / 4.8 KB', 'FAQ block / 4.4 KB'].map((row, idx) => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:15px 16px;border-radius:16px;background:rgba(14,11,30,0.34);border:1px solid rgba(255,255,255,0.08);">
                <div>
                  <div style="font-size:15px;font-weight:700;margin-bottom:4px;">${row}</div>
                  <div style="font-size:13px;line-height:1.5;color:rgba(255,255,255,0.66);">Секция ${idx + 1} готова к копированию, предпросмотру и вставке без повторного прогона модели.</div>
                </div>
                <div style="width:12px;height:12px;border-radius:50%;background:${idx % 2 === 0 ? palette.accent : '#7dd3fc'};box-shadow:0 0 14px rgba(255,255,255,0.38);"></div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </div>
  </div>
</section>`.trim();

    const trustHtml = `
<section style="padding:88px 0;background:${palette.light};font-family:Inter,system-ui,sans-serif;color:${palette.text};box-sizing:border-box;">
  <div style="max-width:1200px;margin:0 auto;padding:0 20px;">
    <div style="display:flex;flex-wrap:wrap;align-items:end;justify-content:space-between;gap:20px;margin-bottom:28px;">
      <div style="max-width:740px;">
        <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:${palette.primary};margin-bottom:12px;">Доверие и контекст</div>
        <h2 style="font-size:42px;line-height:1.08;font-weight:800;letter-spacing:-0.03em;margin:0 0 14px;">Второй блок специально плотный: логотипы, тезисы, цифры и длинные подписи в одном экране.</h2>
        <p style="font-size:18px;line-height:1.75;color:${palette.muted};margin:0;">Такой формат помогает быстро понять, не ломается ли вёрстка на карточках доверия, длинных строках и насыщенных текстовых массивах, когда блок уже готов к настоящей вставке в проект.</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(160px,1fr));gap:12px;min-width:320px;">
        ${[['92%', 'совпадения по визуальному тону'], ['5.8 KB', 'средний объём HTML на секцию'], ['14 слоёв', 'включая бейджи, метрики и подписи'], ['1 клик', 'до копирования или вставки в Tilda']].map(([value, label]) => `
          <div style="padding:18px;border-radius:18px;background:#fff;border:1px solid rgba(105,75,232,0.12);box-shadow:0 12px 30px rgba(18,15,38,0.05);">
            <div style="font-size:26px;font-weight:800;color:${palette.primary};margin-bottom:6px;">${value}</div>
            <div style="font-size:14px;line-height:1.5;color:${palette.muted};">${label}</div>
          </div>
        `).join('')}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;">
      ${['KV-AI Studio', 'Launchbase', 'Tilda Labs', 'Growth Signals', 'Design Ops', 'Prompt Flow', 'Page Forge', 'Studio Nine'].map((name, index) => `
        <div style="padding:18px 20px;border-radius:18px;background:${index % 2 ? '#ffffff' : '#fdfcff'};border:1px solid rgba(105,75,232,0.12);font-size:18px;font-weight:800;color:${index % 3 === 0 ? palette.primary : palette.text};text-align:center;box-shadow:0 10px 24px rgba(18,15,38,0.04);">${name}</div>
      `).join('')}
    </div>
  </div>
</section>`.trim();

    const featuresHtml = `
<section style="padding:96px 0;background:#ffffff;font-family:Inter,system-ui,sans-serif;color:${palette.text};box-sizing:border-box;">
  <div style="max-width:1200px;margin:0 auto;padding:0 20px;">
    <div style="max-width:760px;margin-bottom:28px;">
      <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:${palette.primary};margin-bottom:12px;">Возможности</div>
      <h2 style="font-size:46px;line-height:1.05;font-weight:800;letter-spacing:-0.03em;margin:0 0 14px;">Третий блок даёт много структуры, чтобы код был действительно большим, а не декоративно коротким.</h2>
      <p style="font-size:18px;line-height:1.75;color:${palette.muted};margin:0;">Ниже карточки с описаниями, списками и техническими подписями. В таком формате удобно гонять тяжёлые результаты и проверять, как ведут себя отступы, сетка, контраст и действия пользователя.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;">
      ${featureCards.map(([title, text], index) => `
        <article style="padding:24px;border-radius:24px;background:${index % 2 ? '#f9f7ff' : '#ffffff'};border:1px solid rgba(105,75,232,0.12);box-shadow:0 20px 40px rgba(18,15,38,0.05);transition:transform .3s ease, box-shadow .3s ease;">
          <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg, ${palette.primary}, ${palette.secondary});color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;box-shadow:0 12px 24px rgba(105,75,232,0.28);margin-bottom:18px;">0${index + 1}</div>
          <h3 style="font-size:22px;line-height:1.2;font-weight:800;margin:0 0 10px;">${title}</h3>
          <p style="font-size:15px;line-height:1.75;color:${palette.muted};margin:0 0 16px;">${text}</p>
          <ul style="list-style:none;padding:0;margin:0;display:grid;gap:10px;">
            ${['Крупная вложенность HTML', 'Отдельные строки под CTA и подписи', 'Плотные карточки без пустых заглушек'].map(item => `
              <li style="display:flex;align-items:flex-start;gap:10px;font-size:14px;line-height:1.6;color:${palette.text};">
                <span style="flex:0 0 10px;width:10px;height:10px;border-radius:50%;background:${palette.accent};margin-top:7px;"></span>
                <span>${item}</span>
              </li>
            `).join('')}
          </ul>
        </article>
      `).join('')}
    </div>
  </div>
</section>`.trim();

    const casesHtml = `
<section style="padding:96px 0;background:linear-gradient(180deg, #ffffff 0%, #f6f3ff 100%);font-family:Inter,system-ui,sans-serif;color:${palette.text};box-sizing:border-box;">
  <div style="max-width:1200px;margin:0 auto;padding:0 20px;">
    <div style="display:grid;grid-template-columns:0.9fr 1.1fr;gap:26px;align-items:start;">
      <div style="position:sticky;top:20px;">
        <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:${palette.primary};margin-bottom:12px;">Кейсы</div>
        <h2 style="font-size:44px;line-height:1.06;font-weight:800;letter-spacing:-0.03em;margin:0 0 14px;">Четвёртый блок похож на реальный контентный кейс-раздел и отлично подходит для проверки объёмного кода.</h2>
        <p style="font-size:18px;line-height:1.75;color:${palette.muted};margin:0 0 20px;">Здесь длинные карточки, подробные подписи и вторичные данные. Такой блок полезен, когда нужно проверить не один hero, а полноценные рабочие секции, которые потом действительно будут жить на странице.</p>
        <div style="padding:20px;border-radius:22px;background:${palette.dark};color:#fff;box-shadow:0 24px 48px rgba(18,15,38,0.18);">
          <div style="font-size:14px;color:rgba(255,255,255,0.66);margin-bottom:8px;">Внутренняя заметка</div>
          <div style="font-size:18px;line-height:1.7;">Если блоки этого размера проходят копирование, вставку и визуальную проверку, значит можно смело возвращаться к реальной AI-генерации без опасений за длину ответа.</div>
        </div>
      </div>
      <div style="display:grid;gap:18px;">
        ${cases.map(([title, text], index) => `
          <article style="padding:24px;border-radius:24px;background:#fff;border:1px solid rgba(105,75,232,0.12);box-shadow:0 18px 40px rgba(18,15,38,0.05);">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:14px;">
              <h3 style="font-size:24px;line-height:1.2;font-weight:800;margin:0;">${title}</h3>
              <span style="padding:8px 12px;border-radius:999px;background:${index % 2 ? '#ede9fe' : '#fff7ed'};color:${index % 2 ? palette.primary : '#9a3412'};font-size:12px;font-weight:800;">Case ${index + 1}</span>
            </div>
            <p style="font-size:16px;line-height:1.8;color:${palette.muted};margin:0 0 14px;">${text}</p>
            <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;">
              ${['Многоуровневая вёрстка', 'Подготовленные CTA', 'Длинные текстовые цепочки'].map(item => `
                <div style="padding:14px 16px;border-radius:16px;background:#faf7ff;border:1px solid rgba(105,75,232,0.08);font-size:14px;font-weight:700;color:${palette.text};">${item}</div>
              `).join('')}
            </div>
          </article>
        `).join('')}
      </div>
    </div>
  </div>
</section>`.trim();

    const processHtml = `
<section style="padding:92px 0;background:${palette.dark};font-family:Inter,system-ui,sans-serif;color:#fff;box-sizing:border-box;">
  <div style="max-width:1200px;margin:0 auto;padding:0 20px;">
    <div style="max-width:760px;margin-bottom:28px;">
      <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:${palette.accent};margin-bottom:12px;">Процесс</div>
      <h2 style="font-size:46px;line-height:1.05;font-weight:800;letter-spacing:-0.03em;margin:0 0 14px;">Пятый блок показывает путь от промпта до вставки и добавляет много содержательного HTML в одну секцию.</h2>
      <p style="font-size:18px;line-height:1.75;color:rgba(255,255,255,0.74);margin:0;">Когда секция описывает процесс, в ней неизбежно появляются шаги, карточки, пояснения, рамки и дополнительные элементы интерфейса. Именно это и нужно для теста длинного кода.</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px;">
      ${steps.map(([num, title, text]) => `
        <article style="padding:24px;border-radius:24px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);backdrop-filter:blur(12px);box-shadow:0 20px 40px rgba(0,0,0,0.18);">
          <div style="font-size:14px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:${palette.accent};margin-bottom:16px;">Шаг ${num}</div>
          <h3 style="font-size:22px;line-height:1.2;font-weight:800;margin:0 0 10px;">${title}</h3>
          <p style="font-size:15px;line-height:1.75;color:rgba(255,255,255,0.74);margin:0 0 16px;">${text}</p>
          <div style="padding:14px 16px;border-radius:16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:13px;line-height:1.6;color:rgba(255,255,255,0.70);">Подсказка: именно такие секции чаще всего получаются объёмными при реальной генерации, поэтому тест нужно проводить не на коротких заглушках, а на плотных сценариях.</div>
        </article>
      `).join('')}
    </div>
  </div>
</section>`.trim();

    const faqHtml = `
<section style="padding:92px 0;background:#ffffff;font-family:Inter,system-ui,sans-serif;color:${palette.text};box-sizing:border-box;">
  <div style="max-width:1200px;margin:0 auto;padding:0 20px;">
    <div style="display:grid;grid-template-columns:0.85fr 1.15fr;gap:24px;align-items:start;">
      <div>
        <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:${palette.primary};margin-bottom:12px;">FAQ</div>
        <h2 style="font-size:44px;line-height:1.08;font-weight:800;letter-spacing:-0.03em;margin:0 0 14px;">Шестой блок нужен, чтобы протестировать длинные ответы, аккордеонные карточки и плотный текстовый ритм.</h2>
        <p style="font-size:18px;line-height:1.75;color:${palette.muted};margin:0;">FAQ всегда раздувает HTML естественным образом. Поэтому это идеальный кандидат для локальной проверки: много контента, много вложенности и много шансов поймать возможный сбой до настоящей генерации.</p>
      </div>
      <div style="display:grid;gap:14px;">
        ${faqs.map(([question, answer], index) => `
          <article style="padding:22px 22px 20px;border-radius:22px;background:${index % 2 ? '#faf7ff' : '#ffffff'};border:1px solid rgba(105,75,232,0.12);box-shadow:0 16px 34px rgba(18,15,38,0.05);">
            <div style="display:flex;align-items:start;gap:14px;">
              <div style="flex:0 0 42px;width:42px;height:42px;border-radius:14px;background:linear-gradient(135deg, ${palette.primary}, ${palette.secondary});color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;">?</div>
              <div>
                <h3 style="font-size:21px;line-height:1.3;font-weight:800;margin:0 0 10px;">${question}</h3>
                <p style="font-size:15px;line-height:1.8;color:${palette.muted};margin:0;">${answer}</p>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    </div>
  </div>
</section>`.trim();

    const ctaHtml = `
<section style="padding:100px 0;background:linear-gradient(135deg, #120f26 0%, #20183b 48%, #3d2e75 100%);font-family:Inter,system-ui,sans-serif;color:#fff;box-sizing:border-box;">
  <div style="max-width:1200px;margin:0 auto;padding:0 20px;">
    <div style="padding:34px;border-radius:30px;background:linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03));border:1px solid rgba(255,255,255,0.14);box-shadow:0 34px 70px rgba(0,0,0,0.26);overflow:hidden;position:relative;">
      <div style="position:absolute;right:-80px;top:-60px;width:260px;height:260px;background:radial-gradient(circle, rgba(233,204,87,0.32), transparent 70%);"></div>
      <div style="display:grid;grid-template-columns:1fr auto;gap:22px;align-items:end;margin-bottom:24px;">
        <div>
          <div style="font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:${palette.accent};margin-bottom:12px;">Финальный CTA</div>
          <h2 style="font-size:48px;line-height:1.03;font-weight:800;letter-spacing:-0.03em;margin:0 0 14px;max-width:760px;">Кнопка проверки возвращена прямо в рабочую панель: теперь можно гонять 7 больших блоков перед реальным тестом с AI.</h2>
          <p style="font-size:18px;line-height:1.75;color:rgba(255,255,255,0.76);margin:0;max-width:760px;">Этот финальный блок завершает сценарий и специально остаётся большим по объёму кода: здесь есть CTA, список выгод, компактный footer и несколько самостоятельных зон, чтобы проверка была максимально близка к живой странице.</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;min-width:250px;">
          <a href="#" style="display:inline-flex;align-items:center;justify-content:center;padding:16px 26px;border-radius:14px;background:${palette.accent};color:${palette.text};font-size:16px;font-weight:800;text-decoration:none;">Вставить все блоки по очереди</a>
          <a href="#" style="display:inline-flex;align-items:center;justify-content:center;padding:16px 26px;border-radius:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.16);color:#fff;font-size:16px;font-weight:700;text-decoration:none;">Скопировать общий HTML</a>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:24px;">
        ${['Подходит для быстрого smoke-test перед демо', 'Позволяет проверить реальные объёмы секций', 'Помогает валидировать вставку без затрат на API'].map(text => `
          <div style="padding:18px;border-radius:18px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);font-size:15px;line-height:1.7;color:rgba(255,255,255,0.78);">${text}</div>
        `).join('')}
      </div>
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:20px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.12);">
        <div style="font-size:14px;line-height:1.7;color:rgba(255,255,255,0.62);">Tilda Space AI • Prepared code test flow • Large HTML verification mode</div>
        <div style="display:flex;flex-wrap:wrap;gap:18px;font-size:14px;color:rgba(255,255,255,0.72);">
          <span>Герой</span>
          <span>Карточки</span>
          <span>Кейсы</span>
          <span>FAQ</span>
          <span>CTA</span>
        </div>
      </div>
    </div>
  </div>
</section>`.trim();

    const blocks: TestBlock[] = [
      { type: 'hero', html: heroHtml },
      { type: 'trust', html: trustHtml },
      { type: 'features', html: featuresHtml },
      { type: 'cases', html: casesHtml },
      { type: 'process', html: processHtml },
      { type: 'faq', html: faqHtml },
      { type: 'cta', html: ctaHtml }
    ];

    const tooSmall = blocks.filter((block) => block.html.length < this.testBlockMinLength);
    if (tooSmall.length > 0) {
      throw new Error(`Тестовые блоки слишком короткие: ${tooSmall.map((block) => block.type).join(', ')}`);
    }

    return blocks;
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
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
      const body = doc.body;
      if (!body?.firstElementChild) return html;

      const root = body.firstElementChild;
      const css: string[] = [];
      const eb = 'cubic-bezier(0.22, 1, 0.36, 1)';

      const hasReveal = opts.staggerReveal || opts.fadeInUp || opts.zoomIn;
      if (opts.staggerReveal) css.push(`.tsa-stagger{opacity:0;transform:translateY(40px);transition:opacity .7s ${eb},transform .7s ${eb}}.tsa-stagger.tsa-revealed{opacity:1;transform:translateY(0)}`);
      if (opts.fadeInUp) css.push(`.tsa-fade-up{opacity:0;transform:translateY(28px);transition:opacity .6s ${eb},transform .6s ${eb}}.tsa-fade-up.tsa-revealed{opacity:1;transform:translateY(0)}`);
      if (opts.zoomIn) css.push(`.tsa-zoom{opacity:0;transform:scale(0.92);transition:opacity .55s ${eb},transform .55s ${eb}}.tsa-zoom.tsa-revealed{opacity:1;transform:scale(1)}`);
      if (opts.cardLift) css.push(`.tsa-card-lift{transition:transform .35s ${eb},box-shadow .35s ${eb}}.tsa-card-lift:hover{transform:translateY(-8px);box-shadow:0 20px 40px rgba(0,0,0,.12),0 8px 16px rgba(0,0,0,.08)}`);
      if (opts.glowHover) css.push(`.tsa-glow{transition:box-shadow .4s ease}.tsa-glow:hover{box-shadow:0 0 30px rgba(105,75,232,.35),0 0 60px rgba(105,75,232,.15)}`);
      if (opts.tiltHover) css.push(`.tsa-tilt{transition:transform .3s ${eb};transform-style:preserve-3d}.tsa-tilt:hover{transform:perspective(800px) rotateX(2deg) rotateY(-2deg) scale(1.02)}`);
      if (opts.textClip) css.push(`.tsa-text-clip{opacity:0;clip-path:inset(0 100% 0 0);transition:clip-path .8s ${eb},opacity .6s ${eb}}.tsa-text-clip.tsa-revealed{opacity:1;clip-path:inset(0 0 0 0)}`);
      if (opts.parallax) { css.push(`.tsa-parallax{--py:0;transform:translate3d(0,var(--py),0);transition:transform .15s ease-out;will-change:transform}`); if (opts.cardLift) css.push(`.tsa-card-lift.tsa-parallax:hover{transform:translate3d(0,calc(var(--py) - 8px),0)}`); }
      if (opts.floatSubtle) css.push(`@keyframes tsa-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}.tsa-float{animation:tsa-float 4s ease-in-out infinite}`);
      if (css.length === 0) return html;

      const sectionLike = Array.from(root.children).filter(
        ch => ch.tagName !== 'STYLE' && ch.tagName !== 'SCRIPT'
      ).slice(0, 15);

      sectionLike.forEach((el, i) => {
        if (hasReveal) {
          const cls = opts.staggerReveal ? 'tsa-stagger' : opts.fadeInUp ? 'tsa-fade-up' : 'tsa-zoom';
          el.classList.add(cls, 'tsa-reveal');
          (el as HTMLElement).style.transitionDelay = `${i * 0.08}s`;
        }
        if (opts.cardLift) el.classList.add('tsa-card-lift');
        if (opts.glowHover) el.classList.add('tsa-glow');
        if (opts.tiltHover) el.classList.add('tsa-tilt');
        if (opts.parallax) { el.classList.add('tsa-parallax'); (el as HTMLElement).setAttribute('data-parallax-speed', String(0.2 + (i % 3) * 0.1)); }
        if (opts.floatSubtle && i % 2 === 0) { el.classList.add('tsa-float'); (el as HTMLElement).style.animationDelay = `${i * 0.2}s`; }
      });

      if (opts.textClip) {
        root.querySelectorAll('h1, h2, h3, h4').forEach((h, i) => {
          if (i > 8) return;
          h.classList.add('tsa-text-clip', 'tsa-reveal');
          (h as HTMLElement).style.transitionDelay = `${i * 0.05}s`;
        });
      }

      const style = doc.createElement('style');
      style.textContent = `@media(prefers-reduced-motion:reduce){.tsa-stagger,.tsa-fade-up,.tsa-zoom,.tsa-text-clip,.tsa-float{transition:none;animation:none}}.tsa-reveal{will-change:opacity,transform} ${css.join(' ')}`;
      body.insertBefore(style, body.firstChild);

      const scripts: string[] = [];
      if (hasReveal || opts.textClip) {
        scripts.push(`(function(){var io=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(function(entries){entries.forEach(function(e){if(e.isIntersecting)e.target.classList.add('tsa-revealed');});},{threshold:.06,rootMargin:'0px 0px -50px'}):null;if(io)document.querySelectorAll('.tsa-reveal').forEach(function(el){io.observe(el);});})();`);
      }
      if (opts.parallax) {
        scripts.push(`(function(){var ticking=0;function update(){var sc=window.scrollY||document.documentElement.scrollTop;document.querySelectorAll('.tsa-parallax').forEach(function(el){var s=parseFloat(el.getAttribute('data-parallax-speed'))||0.3;el.style.setProperty('--py',(sc*s*0.1)+'px');});}window.addEventListener('scroll',function(){if(!ticking){requestAnimationFrame(function(){update();ticking=0;});ticking=1;}},{passive:true});update();})();`);
      }
      scripts.forEach(s => {
        const script = doc.createElement('script');
        script.textContent = s;
        body.appendChild(script);
      });

      return body.innerHTML.trim();
    } catch {
      return html;
    }
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

  private async insertBlockIntoTilda(html: string, blockIndex = 0, animOptions?: AnimationOptions): Promise<boolean> {
    this.debugLog(`Начинаю вставку блока ${blockIndex + 1}...`);
    try {
      if (blockIndex > 0) await this.wait(600);
      let processed = this.fixHtmlForTilda(html);
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
