import { PANEL_CSS } from './styles';

class TildaSpaceAI {
  private shadow: ShadowRoot;
  private panel: HTMLElement;
  private fab: HTMLElement;
  private isOpen = false;
  private generatedHtml = '';
  private currentTab: 'preview' | 'code' = 'preview';

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

    this.checkApiKey();
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
      chrome.runtime.sendMessage({ type: 'GET_API_KEY' }, (response: { apiKey: string | null }) => {
        if (response?.apiKey) {
          this.renderPromptUI();
        } else {
          this.renderNoKeyUI();
        }
        resolve();
      });
    });
  }

  private renderNoKeyUI() {
    const body = this.getBody();
    body.innerHTML = `
      <div class="ts-no-key">
        <p>🔑 Для начала работы необходимо задать API ключ Gemini в настройках расширения</p>
        <button class="ts-btn-open">Открыть настройки</button>
      </div>
    `;
    body.querySelector('.ts-btn-open')!.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
    });
  }

  private renderPromptUI() {
    const body = this.getBody();
    body.innerHTML = `
      <div class="ts-prompt-area">
        <textarea id="ts-prompt" placeholder="Опишите блок или секцию, которую хотите создать...&#10;&#10;Например: Hero секция для IT-стартапа с градиентным фоном, заголовком и кнопкой"></textarea>
      </div>
      <button class="ts-generate-btn" id="ts-generate">
        ✨ Сгенерировать блок
      </button>
      <div class="ts-suggestions">
        <p>Быстрые примеры</p>
        <button class="ts-suggestion" data-prompt="Hero секция с большим заголовком, подзаголовком и кнопкой CTA, градиентный фон от синего к фиолетовому">🚀 Hero секция</button>
        <button class="ts-suggestion" data-prompt="Секция с 3 карточками преимуществ, иконками и описаниями, красивый дизайн">⭐ Преимущества (3 карточки)</button>
        <button class="ts-suggestion" data-prompt="Секция с отзывами клиентов, фото, имя, должность и текст отзыва, карусельный стиль">💬 Отзывы клиентов</button>
        <button class="ts-suggestion" data-prompt="Контактная форма с полями: имя, email, телефон, сообщение и кнопка отправки, современный дизайн">📝 Контактная форма</button>
        <button class="ts-suggestion" data-prompt="Footer с логотипом, навигацией в 3 колонки, соцсетями и копирайтом, тёмный фон">📋 Footer</button>
        <button class="ts-suggestion" data-prompt="Таблица с 3 тарифами (Базовый, Про, Бизнес) с ценами и фичами, выделенный рекомендуемый тариф">💰 Тарифы</button>
      </div>
      <div id="ts-result-area"></div>
    `;

    const promptEl = body.querySelector('#ts-prompt') as HTMLTextAreaElement;
    const generateBtn = body.querySelector('#ts-generate') as HTMLButtonElement;

    generateBtn.addEventListener('click', () => {
      const prompt = promptEl.value.trim();
      if (prompt) this.generate(prompt);
    });

    promptEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        const prompt = promptEl.value.trim();
        if (prompt) this.generate(prompt);
      }
    });

    body.querySelectorAll('.ts-suggestion').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prompt = (btn as HTMLElement).dataset.prompt || '';
        promptEl.value = prompt;
        this.generate(prompt);
      });
    });
  }

  private async generate(prompt: string) {
    const body = this.getBody();
    const resultArea = body.querySelector('#ts-result-area') as HTMLElement;
    const generateBtn = body.querySelector('#ts-generate') as HTMLButtonElement;

    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="ts-spinner"></span> Генерация...';

    resultArea.innerHTML = `
      <div class="ts-loading">
        <div class="ts-spinner"></div>
        Gemini генерирует блок...
      </div>
    `;

    try {
      const response = await new Promise<{ success: boolean; html?: string; error?: string }>(
        (resolve) => {
          chrome.runtime.sendMessage(
            { type: 'GENERATE_HTML', prompt },
            (resp) => resolve(resp)
          );
        }
      );

      if (!response.success) {
        throw new Error(response.error || 'Неизвестная ошибка');
      }

      this.generatedHtml = response.html || '';
      this.currentTab = 'preview';
      this.renderResult(resultArea);
    } catch (err) {
      resultArea.innerHTML = `
        <div class="ts-error">
          ❌ ${err instanceof Error ? err.message : 'Ошибка генерации'}
        </div>
      `;
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = '✨ Сгенерировать блок';
    }
  }

  private renderResult(container: HTMLElement) {
    container.innerHTML = `
      <div class="ts-result">
        <div class="ts-result-header">
          <button class="ts-tab ${this.currentTab === 'preview' ? 'active' : ''}" data-tab="preview">👁 Превью</button>
          <button class="ts-tab ${this.currentTab === 'code' ? 'active' : ''}" data-tab="code">&lt;/&gt; HTML</button>
        </div>
        <div id="ts-tab-content"></div>
        <div class="ts-actions">
          <button class="ts-action-btn ts-btn-copy" id="ts-copy">📋 Копировать HTML</button>
          <button class="ts-action-btn ts-btn-insert" id="ts-insert">📥 В Tilda</button>
        </div>
      </div>
    `;

    this.renderTabContent();

    container.querySelectorAll('.ts-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        this.currentTab = (tab as HTMLElement).dataset.tab as 'preview' | 'code';
        container.querySelectorAll('.ts-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.renderTabContent();
      });
    });

    const copyBtn = container.querySelector('#ts-copy') as HTMLButtonElement;
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(this.generatedHtml).then(() => {
        copyBtn.classList.add('copied');
        copyBtn.textContent = '✓ Скопировано!';
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyBtn.textContent = '📋 Копировать HTML';
        }, 2000);
      });
    });

    const insertBtn = container.querySelector('#ts-insert') as HTMLButtonElement;
    insertBtn.addEventListener('click', () => this.insertIntoTilda());
  }

  private renderTabContent() {
    const container = this.shadow.querySelector('#ts-tab-content') as HTMLElement;
    if (this.currentTab === 'preview') {
      const iframe = document.createElement('iframe');
      iframe.sandbox.add('allow-same-origin');
      container.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.className = 'ts-preview';
      wrapper.appendChild(iframe);
      container.appendChild(wrapper);
      iframe.srcdoc = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>body{margin:0;font-family:'Inter',system-ui,sans-serif;}</style>
        </head>
        <body>${this.generatedHtml}</body>
        </html>
      `;
    } else {
      container.innerHTML = `
        <div class="ts-code">
          <pre>${this.escapeHtml(this.generatedHtml)}</pre>
        </div>
      `;
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private insertIntoTilda() {
    navigator.clipboard.writeText(this.generatedHtml).then(() => {
      const resultArea = this.shadow.querySelector('#ts-result-area') as HTMLElement;

      const existing = resultArea.querySelector('.ts-insert-guide');
      if (existing) existing.remove();

      const guide = document.createElement('div');
      guide.className = 'ts-insert-guide';
      guide.style.cssText =
        'margin-top:12px;padding:12px 14px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:8px;font-size:12px;color:#3730a3;line-height:1.6;';
      guide.innerHTML = `
        <strong>HTML скопирован! 📋</strong><br>
        Для вставки в Tilda:<br>
        1. Нажмите <strong>"+"</strong> между блоками<br>
        2. Выберите блок <strong>"T123 — HTML"</strong> (или "Другое" → "HTML")<br>
        3. Нажмите <strong>"Контент"</strong> в настройках блока<br>
        4. Вставьте HTML код (<strong>Ctrl+V</strong>)<br>
        5. Нажмите <strong>"Сохранить и закрыть"</strong>
      `;
      resultArea.appendChild(guide);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TildaSpaceAI());
} else {
  new TildaSpaceAI();
}
