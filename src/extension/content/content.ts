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

class TildaSpaceAI {
  private shadow: ShadowRoot;
  private panel: HTMLElement;
  private fab: HTMLElement;
  private isOpen = false;
  private generatedBlocks: string[] = [];

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
      <button class="ts-generate-btn" id="ts-generate">🤖 Запустить агентов</button>
      <div class="ts-suggestions">
        <p>Готовые сценарии</p>
        <button class="ts-suggestion" data-prompt="Лендинг для IT-стартапа: SaaS платформа для управления проектами. Нужны hero, преимущества, о продукте, тарифы, отзывы, CTA, footer. Стиль: минималистичный, тёмный, как Linear или Vercel">🚀 IT-стартап (тёмный)</button>
        <button class="ts-suggestion" data-prompt="Лендинг для кофейни: уютная атмосфера, авторские напитки. Hero с фото, меню, о нас, галерея, отзывы, контакты, footer. Стиль: тёплый, кремовый, уютный">☕ Кофейня (тёплый)</button>
        <button class="ts-suggestion" data-prompt="Портфолио дизайнера: минималистичный стиль. Hero с именем, галерея работ, обо мне, навыки, контактная форма, footer. Стиль: чистый, белый, с акцентами">🎨 Портфолио (светлый)</button>
        <button class="ts-suggestion" data-prompt="Лендинг фитнес-клуба: энергичный дизайн. Hero, направления, расписание, тренеры, тарифы, отзывы, footer. Стиль: яркий, энергичный, с оранжевыми акцентами">💪 Фитнес-клуб (яркий)</button>
      </div>
      <div id="ts-agent-log"></div>
    `;

    const promptEl = body.querySelector('#ts-prompt') as HTMLTextAreaElement;
    const generateBtn = body.querySelector('#ts-generate') as HTMLButtonElement;

    generateBtn.addEventListener('click', () => {
      const p = promptEl.value.trim();
      if (p) this.runAgents(p);
    });

    promptEl.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        const p = promptEl.value.trim();
        if (p) this.runAgents(p);
      }
    });

    body.querySelectorAll('.ts-suggestion').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = (btn as HTMLElement).dataset.prompt || '';
        promptEl.value = p;
        this.runAgents(p);
      });
    });
  }

  // ─── Agent System ───

  private log(html: string) {
    const logEl = this.shadow.querySelector('#ts-agent-log');
    if (logEl) logEl.innerHTML = html;
  }

  private appendLog(html: string) {
    const logEl = this.shadow.querySelector('#ts-agent-log');
    if (logEl) logEl.innerHTML += html;
  }

  private async runAgents(prompt: string) {
    const generateBtn = this.shadow.querySelector('#ts-generate') as HTMLButtonElement;
    generateBtn.disabled = true;
    generateBtn.textContent = '🤖 Агенты работают...';
    this.generatedBlocks = [];

    try {
      // Phase 1: Orchestrator creates design system and plan
      this.log(`
        <div class="ts-agent-phase">
          <div class="ts-agent-title">🎨 Дизайн-агент</div>
          <div class="ts-agent-status">
            <div class="ts-spinner"></div>
            Создаю единый дизайн и план страницы...
          </div>
        </div>
      `);

      const planResp = await this.sendMessage({ type: 'AGENT_PLAN', prompt }) as { success: boolean; plan?: AgentPlan; error?: string };
      if (!planResp.success || !planResp.plan) throw new Error(planResp.error || 'Ошибка планирования');
      const plan = planResp.plan;

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

      // Phase 2: Generate each block sequentially
      for (let i = 0; i < plan.blocks.length; i++) {
        const block = plan.blocks[i];
        this.appendLog(`
          <div class="ts-agent-phase" id="ts-block-${i}">
            <div class="ts-agent-title">🔨 Блок ${i + 1}/${plan.blocks.length}: ${block.type}</div>
            <div class="ts-agent-status">
              <div class="ts-spinner"></div>
              Генерирую "${block.description.slice(0, 60)}..."
            </div>
          </div>
        `);

        const blockResp = await this.sendMessage({
          type: 'AGENT_BLOCK',
          designSystem: plan.designSystem,
          block,
          blockIndex: i,
          totalBlocks: plan.blocks.length,
        }) as { success: boolean; html?: string; error?: string };

        if (!blockResp.success || !blockResp.html) {
          this.updateBlockStatus(i, '❌', `Ошибка: ${blockResp.error}`);
          continue;
        }

        this.generatedBlocks.push(blockResp.html);
        this.updateBlockStatus(i, '✅', 'Готово');

        // Insert into Tilda
        this.updateBlockStatus(i, '📥', 'Вставляю в Tilda...');
        const inserted = await this.insertBlockIntoTilda(blockResp.html);
        this.updateBlockStatus(i, inserted ? '✅' : '📋', inserted ? 'Вставлен' : 'Скопирован');
      }

      // Phase 3: Publish
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

      // Final summary
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

  // ─── Tilda Insertion ───

  private async insertBlockIntoTilda(html: string): Promise<boolean> {
    try {
      await this.clipboardWrite(html);

      // Find and click "Все блоки"
      const allBlocksBtn = this.findByText('a, button, div, span', 'все блоки');
      if (!allBlocksBtn) return false;
      allBlocksBtn.click();
      await this.wait(1200);

      // Find and click "Другое"
      const otherCat = await this.waitFor(() => this.findByText('a, div, li, span', 'другое'), 3000);
      if (!otherCat) return false;
      otherCat.click();
      await this.wait(1000);

      // Find and click T123
      const t123 = await this.waitFor(() => {
        for (const el of document.querySelectorAll('a, div, li, span')) {
          const t = (el as HTMLElement).innerText?.trim();
          if (t === 'HTML-код' || t?.startsWith('T123')) return el as HTMLElement;
        }
        return null;
      }, 3000);

      if (!t123) return false;
      t123.click();
      await this.wait(2000);

      // Close sidebar
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await this.wait(600);

      // Find the block and click "Контент"
      const contentBtn = await this.waitFor(() => {
        for (const el of document.querySelectorAll('a, button, div, span')) {
          const t = (el as HTMLElement).innerText?.trim();
          const rect = (el as HTMLElement).getBoundingClientRect();
          if ((t === 'Контент' || t === 'контент') && rect.width > 20) return el as HTMLElement;
        }
        return null;
      }, 3000);

      if (contentBtn) {
        contentBtn.click();
        await this.wait(1500);
        await this.pasteIntoEditor(html);
        await this.wait(500);

        const saveBtn = this.findByText('a, button, div, span', 'сохранить и закрыть')
          || this.findByText('a, button, div, span', 'сохранить');
        if (saveBtn) { saveBtn.click(); await this.wait(1000); }
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  private async pasteIntoEditor(html: string): Promise<boolean> {
    await this.wait(500);

    // CodeMirror
    for (const cmEl of document.querySelectorAll('.CodeMirror')) {
      const cm = (cmEl as HTMLElement & { CodeMirror?: { setValue: (v: string) => void } }).CodeMirror;
      if (cm) { cm.setValue(html); return true; }
    }

    // Textarea
    for (const ta of document.querySelectorAll('textarea')) {
      const rect = ta.getBoundingClientRect();
      if (rect.width > 50 && rect.height > 20) {
        ta.focus();
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
        if (setter) setter.call(ta, html); else ta.value = html;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }

    return false;
  }

  private async publishPage(): Promise<boolean> {
    try {
      const pubBtn = this.findByText('a, button, div, span', 'опубликовать');
      if (!pubBtn) return false;
      pubBtn.click();
      await this.wait(2000);

      // Confirm publish dialog
      const confirmBtn = this.findByText('a, button, div, span', 'опубликовать')
        || this.findByText('a, button, div, span', 'publish');
      if (confirmBtn && confirmBtn !== pubBtn) {
        confirmBtn.click();
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
