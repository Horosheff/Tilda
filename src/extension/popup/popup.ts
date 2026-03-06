// Tilda Space AI - Popup Script (TypeScript)

import { createLargeTestBlocks } from '../shared/testBlocks';

interface GeneratedBlock {
  type: string;
  html: string;
}

const PRESETS: Record<string, string> = {
  kvai: 'Лендинг для AI-сервиса: hero с фиолетовым градиентом #694be8, преимущества, модули/тарифы с иконками, FAQ аккордеон с желтой рамкой #e9cc57, отзывы, CTA, footer. Стиль: фиолетовый основной #694be8, желтый акцент #e9cc57, белый текст, современный premium',
  startup: 'Лендинг для IT-стартапа: SaaS платформа для управления проектами. Нужны hero, преимущества, о продукте, тарифы, отзывы, CTA, footer. Стиль: минималистичный, тёмный, как Linear или Vercel',
  cafe: 'Лендинг для кофейни: уютная атмосфера, авторские напитки. Hero с фото, меню, о нас, галерея, отзывы, контакты, footer. Стиль: тёплый, кремовый, уютный',
  portfolio: 'Портфолио дизайнера: минималистичный стиль. Hero с именем, галерея работ, обо мне, навыки, контактная форма, footer. Стиль: чистый, белый, с акцентами',
  fitness: 'Лендинг фитнес-клуба: энергичный дизайн. Hero, направления, расписание, тренеры, тарифы, отзывы, footer. Стиль: яркий, энергичный, с оранжевыми акцентами',
  yandex: 'Yandex Metrika Style (yandex.ru/adv/metrika). Hero: H1 40–48px + subline + CTA + stat-badge. Feature-duo: 2 карточки иконка+заголовок+текст. Grid «Возможности»: 5–6 карточек-ссылок. Stats: 3 числа (9 млн, 1.6 млн, 120). News: 3 карточки дата+заголовок+excerpt. Promo-block тёмный + CTA. «Читайте также»: 6–8 статей. FAQ accordion. CTA 2 кнопки. Footer 3 ссылки+колонки. Цвета: bg #fff, primary #2D7FF9, text #000, muted #666. Карточки: border-radius 12px, shadow 0 2px 8px rgba(0,0,0,0.08). Чистый корпоративный.'
};
const TEST_BLOCK_MIN_LENGTH = 2500;

let apiKey: string | null = null;
let selectedModel = 'gemini-2.5-pro';
let generatedBlocks: GeneratedBlock[] = [];
let isGenerating = false;

// DOM Elements
const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
const modelSelect = document.getElementById('modelSelect') as HTMLSelectElement | null;
const saveKeyBtn = document.getElementById('saveKeyBtn') as HTMLButtonElement;
const statusBar = document.getElementById('statusBar') as HTMLElement;
const statusText = document.getElementById('statusText') as HTMLElement;
const promptInput = document.getElementById('prompt') as HTMLTextAreaElement;
const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
const testLargeBlocksBtn = document.getElementById('testLargeBlocksBtn') as HTMLButtonElement;
const useTemplateBtn = document.getElementById('useTemplateBtn') as HTMLButtonElement;
const templateStatus = document.getElementById('templateStatus') as HTMLElement;
const logContent = document.getElementById('logContent') as HTMLElement;
const logToggle = document.getElementById('logToggle') as HTMLElement;
const resultsSection = document.getElementById('resultsSection') as HTMLElement;
const blocksList = document.getElementById('blocksList') as HTMLElement;
const copyAllBtn = document.getElementById('copyAllBtn') as HTMLButtonElement;
const messageEl = document.getElementById('message') as HTMLElement;

// Initialization
chrome.storage.local.get(['geminiApiKey', 'selectedModel', 'templateHtml'], (result: Record<string, string>) => {
  apiKey = (result.geminiApiKey as string) || null;
  if (result.selectedModel) {
    selectedModel = result.selectedModel as string;
    if (modelSelect) modelSelect.value = selectedModel;
  }

  if (apiKey) {
    apiKeyInput.value = apiKey;
    updateStatus('ok', '✓ API ключ сохранен');
    generateBtn.disabled = false;
  } else {
    updateStatus('warning', 'Введите API ключ для генерации');
  }

  if (result.templateHtml) {
    templateStatus.textContent = '✓ Шаблон загружен';
  }
});

// Event Listeners
saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  const model = modelSelect ? modelSelect.value : 'gemini-2.5-pro';

  if (key) {
    chrome.storage.local.set({ geminiApiKey: key, selectedModel: model }, () => {
      apiKey = key;
      selectedModel = model;
      updateStatus('ok', '✓ API ключ и модель сохранены');
      generateBtn.disabled = false;
      showMessage('Настройки успешно сохранены', 'success');
    });
  }
});

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const preset = PRESETS[(btn as HTMLElement).dataset.preset || ''];
    if (preset) {
      promptInput.value = preset;
      log(`Выбран пресет: ${(btn as HTMLElement).textContent?.trim().split('\n')[0]}`);
    }
  });
});

// SVG Generator
let lastSvg = '';
const svgIconInput = document.getElementById('svgIconInput') as HTMLInputElement | null;
const svgAnimInput = document.getElementById('svgAnimInput') as HTMLInputElement | null;
const svgIconBtn = document.getElementById('svgIconBtn') as HTMLButtonElement | null;
const svgAnimBtn = document.getElementById('svgAnimBtn') as HTMLButtonElement | null;
const svgResult = document.getElementById('svgResult') as HTMLElement | null;
const svgPreview = document.getElementById('svgPreview') as HTMLElement | null;
const svgCopyBtn = document.getElementById('svgCopyBtn') as HTMLButtonElement | null;

async function runSvgGen(type: 'icon' | 'anim'): Promise<void> {
  const input = type === 'icon' ? svgIconInput : svgAnimInput;
  const prompt = input?.value.trim();
  if (!prompt) return;
  const btn = type === 'icon' ? svgIconBtn : svgAnimBtn;
  if (btn) {
    btn.disabled = true;
    btn.textContent = '…';
  }
  try {
    const resp = await sendRuntimeMessage({
      type: type === 'icon' ? 'GENERATE_SVG_ICON' : 'GENERATE_SVG_ANIMATION',
      prompt,
      size: type === 'icon' ? 48 : undefined,
    });
    if (resp.success && resp.svg) {
      lastSvg = resp.svg as string;
      if (svgResult) svgResult.style.display = 'block';
      if (svgPreview) {
        svgPreview.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.style.cssText = 'padding:12px;background:#fff;border-radius:6px;display:flex;align-items:center;justify-content:center;min-height:60px;';
        wrap.innerHTML = resp.svg as string;
        const svgEl = wrap.querySelector('svg');
        if (svgEl) {
          if (type === 'anim') { svgEl.setAttribute('width', '160'); svgEl.setAttribute('height', '100'); }
          else { svgEl.setAttribute('width', '48'); svgEl.setAttribute('height', '48'); }
        }
        svgPreview.appendChild(wrap);
      }
      log(`SVG ${type === 'icon' ? 'иконка' : 'анимация'} сгенерирована`);
    } else {
      log(`SVG ошибка: ${resp.error || 'unknown'}`, true);
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = type === 'icon' ? 'Иконка' : 'Анимация';
    }
  }
}

if (svgIconBtn) svgIconBtn.addEventListener('click', () => runSvgGen('icon'));
if (svgAnimBtn) svgAnimBtn.addEventListener('click', () => runSvgGen('anim'));
if (svgCopyBtn) svgCopyBtn.addEventListener('click', () => {
  if (lastSvg) {
    navigator.clipboard.writeText(lastSvg).then(() => {
      svgCopyBtn.textContent = '✓ Скопировано';
      setTimeout(() => { svgCopyBtn.textContent = '📋 Копировать'; }, 1500);
    });
  }
});

useTemplateBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_PAGE_HTML' }, (response) => {
        if (response && response.html) {
          chrome.storage.local.set({ templateHtml: response.html }, () => {
            templateStatus.textContent = '✓ Шаблон загружен';
            log('Шаблон текущей страницы сохранен');
          });
        } else {
          log('Не удалось получить HTML страницы', true);
        }
      });
    }
  });
});

generateBtn.addEventListener('click', async () => {
  if (isGenerating) return;

  const prompt = promptInput.value.trim();
  if (!prompt) {
    showMessage('Введите описание сайта', 'error');
    return;
  }

  if (!apiKey) {
    showMessage('Сначала сохраните API ключ', 'error');
    return;
  }

  isGenerating = true;
  generateBtn.disabled = true;
  testLargeBlocksBtn.disabled = true;
  generateBtn.textContent = '🤖 Генерация...';
  resultsSection.style.display = 'none';
  blocksList.innerHTML = '';
  generatedBlocks = [];
  clearLog();
  log('Запуск агентов...');

  try {
    const templateResult = await chrome.storage.local.get(['templateHtml']) as Record<string, string>;
    const templateHtml: string | null = (templateResult.templateHtml as string) || null;

    log('🎨 Дизайн-агент создает план...');
    const plan = await getAgentPlan(prompt, templateHtml);
    log(`✓ План создан: ${plan.blocks.length} блоков`);

    log('🔨 Начинаем параллельную генерацию всех блоков...');
    const generationPromises = plan.blocks.map(async (block: { type: string }, i: number) => {
      log(`🤖 Агент начал работу над блоком ${i + 1}/${plan.blocks.length}: ${block.type}...`);
      try {
        const html = await generateBlock(plan.designSystem, block, i, plan.blocks.length);
        log(`✓ Блок ${i + 1} (${block.type}) готов`);
        return { index: i, type: block.type, html, success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log(`❌ Ошибка блока ${i + 1}: ${msg}`, true);
        return { index: i, type: block.type, html: '', success: false, error: err };
      }
    });

    const results = await Promise.all(generationPromises);

    results.sort((a, b) => a.index - b.index);
    for (const res of results) {
      if (res.success) {
        generatedBlocks.push({ type: res.type, html: res.html });
        addBlockToResults(res.index, res.type, res.html);
      }
    }

    resultsSection.style.display = 'block';
    showMessage(`✓ Создано ${generatedBlocks.length} блоков`, 'success');

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Ошибка: ${msg}`, true);
    showMessage(msg, 'error');
  } finally {
    isGenerating = false;
    generateBtn.disabled = false;
    testLargeBlocksBtn.disabled = false;
    generateBtn.textContent = '🤖 Запустить агентов';
  }
});

testLargeBlocksBtn.addEventListener('click', () => {
  if (isGenerating) return;

  isGenerating = true;
  generateBtn.disabled = true;
  testLargeBlocksBtn.disabled = true;
  testLargeBlocksBtn.textContent = '🧪 Готовлю тест...';
  resultsSection.style.display = 'none';
  blocksList.innerHTML = '';
  generatedBlocks = [];
  clearLog();
  log('Запуск локальной проверки 7 больших блоков...');

  try {
    const testBlocks = createLargeTestBlocks(TEST_BLOCK_MIN_LENGTH);

    testBlocks.forEach((block, index) => {
      const sizeLabel = getCodeSizeLabel(block.html.length);
      generatedBlocks.push({ type: block.type, html: block.html });
      addBlockToResults(index, block.type, block.html, sizeLabel);
      log(`✓ Тестовый блок ${index + 1}/7: ${block.type} (${sizeLabel})`);
    });

    resultsSection.style.display = 'block';
    showMessage(`✓ Загружено ${testBlocks.length} больших тестовых блоков`, 'success');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`Ошибка тестовых блоков: ${msg}`, true);
    showMessage(msg, 'error');
  } finally {
    isGenerating = false;
    generateBtn.disabled = false;
    testLargeBlocksBtn.disabled = false;
    testLargeBlocksBtn.textContent = '🧪 Проверка 7 больших блоков';
  }
});

logToggle.addEventListener('click', () => {
  logContent.classList.toggle('collapsed');
  logToggle.textContent = logContent.classList.contains('collapsed') ? 'Показать' : 'Скрыть';
});

copyAllBtn.addEventListener('click', () => {
  const allHtml = generatedBlocks.map(b => b.html).join('\n\n');
  navigator.clipboard.writeText(allHtml).then(() => {
    showMessage('✓ HTML скопирован в буфер', 'success');
  });
});

// UI Helpers
function updateStatus(type: string, text: string): void {
  statusBar.className = `status-bar ${type}`;
  statusBar.style.display = 'flex';
  statusText.textContent = text;

  const dot = statusBar.querySelector('.dot') as HTMLElement | null;
  if (dot) dot.className = `dot ${type === 'ok' ? 'green' : type === 'error' ? 'red' : 'yellow'}`;
}

function log(msg: string, isError = false): void {
  if (logContent.querySelector('.log-placeholder')) {
    logContent.innerHTML = '';
  }

  const div = document.createElement('div');
  div.className = isError ? 'log-err' : 'log-msg';

  const time = new Date().toLocaleTimeString('ru-RU', { hour12: false });
  div.textContent = `[${time}] ${msg}`;

  logContent.appendChild(div);
  logContent.scrollTop = logContent.scrollHeight;
}

function clearLog(): void {
  logContent.innerHTML = '';
}

function showMessage(text: string, type: string): void {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';

  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 5000);
}

function formatCodeSize(length: number): string {
  return `${(length / 1024).toFixed(1)} KB`;
}

function getCodeSizeLabel(length: number): string {
  const size = formatCodeSize(length);
  return length >= TEST_BLOCK_MIN_LENGTH ? `${size} code` : `${size} мало кода`;
}

function addBlockToResults(index: number, type: string, html: string, status = '✓ Готово'): void {
  const blockDiv = document.createElement('div');
  blockDiv.className = 'block-item';

  blockDiv.innerHTML = `
    <div class="block-header">
      <span class="block-type">${index + 1}. ${type.toUpperCase()}</span>
      <span class="block-status">${status}</span>
    </div>
    <div class="block-actions">
      <button class="copy-btn">📋 Копировать HTML</button>
      <button class="primary insert-btn">Вставить в Tilda</button>
    </div>
  `;

  const copyBtn = blockDiv.querySelector('.copy-btn') as HTMLButtonElement;
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(html).then(() => {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✓ Скопировано';
      setTimeout(() => copyBtn.textContent = originalText, 2000);
    });
  });

  const insertBtn = blockDiv.querySelector('.insert-btn') as HTMLButtonElement;
  insertBtn.addEventListener('click', () => {
    insertBlock(html, insertBtn);
  });

  blocksList.appendChild(blockDiv);
}

function insertBlock(html: string, btnEl: HTMLButtonElement): void {
  const originalText = btnEl.textContent;
  btnEl.textContent = 'Вставляем...';
  btnEl.disabled = true;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'INSERT_BLOCK',
        html: html
      }, (response) => {
        btnEl.disabled = false;
        if (response && response.success) {
          btnEl.textContent = '✓ Вставлено';
          setTimeout(() => btnEl.textContent = originalText, 3000);
          log(`✓ Блок успешно вставлен в Tilda`);
        } else {
          btnEl.textContent = '❌ Ошибка';
          setTimeout(() => btnEl.textContent = originalText, 3000);
          log(`❌ Ошибка вставки: ${response ? response.error : 'Нет связи с Tilda'}`, true);
          showMessage('Не удалось вставить блок. Откройте редактор Tilda.', 'error');
        }
      });
    }
  });
}

// AI Functions
async function getAgentPlan(prompt: string, templateHtml: string | null): Promise<{ designSystem: Record<string, unknown>; blocks: { type: string }[] }> {
  const response = await sendRuntimeMessage({
    type: 'AGENT_PLAN',
    prompt,
    templateHtml,
  });

  if (!response.success || !response.plan) {
    throw new Error((response.error as string) || 'Ошибка планирования');
  }

  return response.plan as { designSystem: Record<string, unknown>; blocks: { type: string }[] };
}

async function generateBlock(designSystem: Record<string, unknown>, block: { type: string }, index: number, total: number): Promise<string> {
  const response = await sendRuntimeMessage({
    type: 'AGENT_BLOCK',
    designSystem,
    block,
    blockIndex: index,
    totalBlocks: total,
  });

  if (!response.success || !response.html) {
    throw new Error((response.error as string) || `Ошибка генерации блока ${index + 1}`);
  }

  return response.html as string;
}

function sendRuntimeMessage(message: Record<string, unknown>): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => resolve((response || {}) as Record<string, unknown>));
  });
}
