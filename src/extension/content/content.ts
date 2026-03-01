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
        <p>🔑 Задайте API ключ Gemini в настройках расширения (иконка в панели Chrome)</p>
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
        <textarea id="ts-prompt" placeholder="Опишите страницу или блок...&#10;&#10;Например:&#10;• Лендинг для фитнес-студии&#10;• Hero секция с градиентом&#10;• Страница с ценами и тарифами"></textarea>
      </div>
      <button class="ts-generate-btn" id="ts-generate">
        ✨ Сгенерировать и вставить в Tilda
      </button>
      <div class="ts-mode-toggle">
        <label><input type="checkbox" id="ts-auto-insert" checked> Автовставка в Tilda</label>
      </div>
      <div class="ts-suggestions">
        <p>Страницы</p>
        <button class="ts-suggestion" data-prompt="Создай полный лендинг для IT-стартапа: hero с градиентом, 3 преимущества с иконками, секция о продукте, отзывы клиентов, CTA и footer">🚀 Лендинг IT-стартапа</button>
        <button class="ts-suggestion" data-prompt="Создай полную страницу ресторана: hero с фото еды, меню с ценами в 3 колонки, галерея фото, отзывы гостей, форма бронирования, footer с контактами и картой">🍽 Страница ресторана</button>
        <button class="ts-suggestion" data-prompt="Создай полный лендинг онлайн-школы: hero с заголовком и кнопкой записи, преимущества обучения, программа курса, отзывы студентов, тарифы (3 плана), FAQ, footer">🎓 Лендинг онлайн-школы</button>
        <p style="margin-top:8px">Блоки</p>
        <button class="ts-suggestion" data-prompt="Hero секция с большим заголовком, подзаголовком и кнопкой CTA, красивый градиентный фон">🎯 Hero секция</button>
        <button class="ts-suggestion" data-prompt="Секция с 3 тарифами (Базовый, Про, Бизнес) с ценами, списком фич и кнопками, выделенный рекомендуемый тариф">💰 Тарифы</button>
        <button class="ts-suggestion" data-prompt="Контактная форма с полями: имя, email, телефон, сообщение и кнопка отправки, современный дизайн на светлом фоне">📝 Форма контакта</button>
        <button class="ts-suggestion" data-prompt="Footer сайта с логотипом, навигацией в 4 колонки, иконками соцсетей и копирайтом, тёмный фон">📋 Footer</button>
        <button class="ts-suggestion" data-prompt="Секция с 3 отзывами клиентов с фото, именем, должностью и текстом, карточный дизайн">💬 Отзывы</button>
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
    const autoInsert = (body.querySelector('#ts-auto-insert') as HTMLInputElement)?.checked ?? true;

    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span class="ts-spinner"></span> Gemini 3.1 Pro генерирует...';

    resultArea.innerHTML = `
      <div class="ts-loading">
        <div class="ts-spinner"></div>
        <div>
          <div style="font-weight:600;margin-bottom:4px">Генерация с Gemini 3.1 Pro...</div>
          <div style="font-size:11px;color:#94a3b8">Это может занять 10-30 секунд</div>
        </div>
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

      if (autoInsert) {
        await this.autoInsertIntoTilda();
      }
    } catch (err) {
      resultArea.innerHTML = `
        <div class="ts-error">
          ❌ ${err instanceof Error ? err.message : 'Ошибка генерации'}
        </div>
      `;
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = '✨ Сгенерировать и вставить в Tilda';
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
          <button class="ts-action-btn ts-btn-copy" id="ts-copy">📋 Копировать</button>
          <button class="ts-action-btn ts-btn-insert" id="ts-insert">📥 Вставить в Tilda</button>
        </div>
        <div id="ts-insert-status"></div>
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
    copyBtn.addEventListener('click', async () => {
      await this.clipboardWrite(this.generatedHtml);
      copyBtn.classList.add('copied');
      copyBtn.textContent = '✓ Скопировано!';
      setTimeout(() => {
        copyBtn.classList.remove('copied');
        copyBtn.textContent = '📋 Копировать';
      }, 2000);
    });

    const insertBtn = container.querySelector('#ts-insert') as HTMLButtonElement;
    insertBtn.addEventListener('click', () => this.autoInsertIntoTilda());
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
      iframe.srcdoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><style>body{margin:0;font-family:'Inter',system-ui,sans-serif;}</style></head><body>${this.generatedHtml}</body></html>`;
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

  private showInsertStatus(html: string) {
    const statusEl = this.shadow.querySelector('#ts-insert-status');
    if (statusEl) statusEl.innerHTML = html;
  }

  private copyToClipboardFallback(text: string): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0;';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    document.body.removeChild(textarea);
    return ok;
  }

  private async clipboardWrite(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      this.copyToClipboardFallback(text);
    }
  }

  private async autoInsertIntoTilda() {
    this.showInsertStatus(`
      <div class="ts-insert-progress">
        <div class="ts-spinner" style="width:16px;height:16px;border-width:2px;"></div>
        Вставляю блок в Tilda...
      </div>
    `);

    try {
      await this.clipboardWrite(this.generatedHtml);

      const inserted = await this.tryInsertBlock();

      if (inserted) {
        this.showInsertStatus(`
          <div class="ts-insert-success">
            ✅ <strong>Блок вставлен в Tilda!</strong><br>
            <span style="font-size:11px;color:#64748b">HTML блок добавлен на страницу. Прокрутите вниз чтобы увидеть его.</span>
          </div>
        `);
      } else {
        this.showInsertStatus(`
          <div class="ts-insert-guide">
            📋 <strong>HTML скопирован в буфер!</strong><br>
            Автовставка не удалась. Вставьте вручную:<br>
            1. Нажмите <strong>"Все блоки"</strong> внизу страницы<br>
            2. Найдите блок <strong>"Другое" → "HTML"</strong> (T123)<br>
            3. Добавьте блок и нажмите <strong>"Контент"</strong><br>
            4. Вставьте код: <strong>Ctrl+V</strong><br>
            5. Нажмите <strong>"Сохранить и закрыть"</strong>
          </div>
        `);
      }
    } catch (err) {
      this.showInsertStatus(`
        <div class="ts-error" style="margin-top:8px">
          ❌ Ошибка вставки: ${err instanceof Error ? err.message : 'неизвестная ошибка'}
        </div>
      `);
    }
  }

  private async tryInsertBlock(): Promise<boolean> {
    try {
      const addBtnSelectors = [
        '.tn-add-block-btn',
        '[data-tooltip="Добавить блок"]',
        '.tn-add__btn',
        '#record-add-block',
        '.record__add-btn',
        'button[class*="add-block"]',
        'a[class*="add-block"]',
        '.add_block_link',
        '.tn-editor__add-btn',
      ];

      let addBtn: HTMLElement | null = null;
      for (const sel of addBtnSelectors) {
        addBtn = document.querySelector(sel);
        if (addBtn) break;
      }

      if (!addBtn) {
        const allBtns = document.querySelectorAll('a, button, div[class*="add"]');
        for (const el of allBtns) {
          const text = (el as HTMLElement).innerText?.toLowerCase() || '';
          const cls = (el as HTMLElement).className?.toLowerCase() || '';
          if (text.includes('добавить') || text.includes('все блоки') ||
              cls.includes('add-block') || cls.includes('addblock')) {
            addBtn = el as HTMLElement;
            break;
          }
        }
      }

      const allBlocksBtn = document.querySelector('.tn-add__blocks-btn') ||
                          document.querySelector('[data-filter="all"]') ||
                          document.querySelector('.tn-add__tab_active');

      if (allBlocksBtn) {
        (allBlocksBtn as HTMLElement).click();
        await this.wait(500);
      }

      const htmlBlockSelectors = [
        '[data-block-id="T123"]',
        '[data-block="T123"]',
        '[data-name="T123"]',
        '.tn-add__block[data-block-id="T123"]',
      ];

      let htmlBlock: HTMLElement | null = null;
      for (const sel of htmlBlockSelectors) {
        htmlBlock = document.querySelector(sel);
        if (htmlBlock) break;
      }

      if (!htmlBlock) {
        const otherTab = document.querySelector('[data-filter="other"]') ||
                         document.querySelector('.tn-add__tab[data-filter="other"]');
        if (otherTab) {
          (otherTab as HTMLElement).click();
          await this.wait(500);
          for (const sel of htmlBlockSelectors) {
            htmlBlock = document.querySelector(sel);
            if (htmlBlock) break;
          }
        }
      }

      if (!htmlBlock) {
        const blockElements = document.querySelectorAll('[data-block-id], [data-block]');
        for (const el of blockElements) {
          const blockId = (el as HTMLElement).dataset.blockId || (el as HTMLElement).dataset.block || '';
          const text = (el as HTMLElement).innerText || '';
          if (blockId === 'T123' || blockId.toLowerCase().includes('html') ||
              text.toLowerCase().includes('html') || text === 'T123') {
            htmlBlock = el as HTMLElement;
            break;
          }
        }
      }

      if (htmlBlock) {
        htmlBlock.click();
        await this.wait(1000);

        const contentBtnSelectors = [
          '.tn-popup__btn-content',
          'button[data-action="content"]',
          '.tn-editor-block__btn-content',
          '[class*="btn-content"]',
          '[class*="content-btn"]',
        ];

        let contentBtn: HTMLElement | null = null;
        for (const sel of contentBtnSelectors) {
          contentBtn = document.querySelector(sel);
          if (contentBtn) break;
        }

        if (!contentBtn) {
          const btns = document.querySelectorAll('button, a, div[role="button"]');
          for (const el of btns) {
            const text = (el as HTMLElement).innerText?.toLowerCase() || '';
            if (text.includes('контент') || text.includes('content') || text.includes('редактировать')) {
              contentBtn = el as HTMLElement;
              break;
            }
          }
        }

        if (contentBtn) {
          contentBtn.click();
          await this.wait(800);

          const codeEditors = document.querySelectorAll(
            'textarea, .CodeMirror, [contenteditable="true"], .ace_editor, .code-editor textarea'
          );

          for (const editor of codeEditors) {
            if (editor instanceof HTMLTextAreaElement) {
              editor.focus();
              editor.value = this.generatedHtml;
              editor.dispatchEvent(new Event('input', { bubbles: true }));
              editor.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }

            const cmInstance = (editor as HTMLElement & { CodeMirror?: { setValue: (v: string) => void } }).CodeMirror;
            if (cmInstance) {
              cmInstance.setValue(this.generatedHtml);
              return true;
            }

            if ((editor as HTMLElement).getAttribute('contenteditable') === 'true') {
              (editor as HTMLElement).innerHTML = this.escapeHtml(this.generatedHtml);
              (editor as HTMLElement).dispatchEvent(new Event('input', { bubbles: true }));
              return true;
            }
          }

          document.execCommand('selectAll');
          document.execCommand('insertText', false, this.generatedHtml);
          return true;
        }

        return true;
      }

      if (addBtn) {
        addBtn.click();
        await this.wait(800);
        return false;
      }

      return false;
    } catch {
      return false;
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new TildaSpaceAI());
} else {
  new TildaSpaceAI();
}
