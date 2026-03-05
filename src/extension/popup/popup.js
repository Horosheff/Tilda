// Tilda Space AI - Popup Script

const PRESETS = {
  kvai: 'Лендинг для AI-сервиса: hero с фиолетовым градиентом #694be8, преимущества, модули/тарифы с иконками, FAQ аккордеон с желтой рамкой #e9cc57, отзывы, CTA, footer. Стиль: фиолетовый основной #694be8, желтый акцент #e9cc57, белый текст, современный premium',
  startup: 'Лендинг для IT-стартапа: SaaS платформа для управления проектами. Нужны hero, преимущества, о продукте, тарифы, отзывы, CTA, footer. Стиль: минималистичный, тёмный, как Linear или Vercel',
  cafe: 'Лендинг для кофейни: уютная атмосфера, авторские напитки. Hero с фото, меню, о нас, галерея, отзывы, контакты, footer. Стиль: тёплый, кремовый, уютный',
  portfolio: 'Портфолио дизайнера: минималистичный стиль. Hero с именем, галерея работ, обо мне, навыки, контактная форма, footer. Стиль: чистый, белый, с акцентами',
  fitness: 'Лендинг фитнес-клуба: энергичный дизайн. Hero, направления, расписание, тренеры, тарифы, отзывы, footer. Стиль: яркий, энергичный, с оранжевыми акцентами',
  yandex: 'Yandex Metrika Style (yandex.ru/adv/metrika). Hero: H1 40–48px + subline + CTA + stat-badge. Feature-duo: 2 карточки иконка+заголовок+текст. Grid «Возможности»: 5–6 карточек-ссылок. Stats: 3 числа (9 млн, 1.6 млн, 120). News: 3 карточки дата+заголовок+excerpt. Promo-block тёмный + CTA. «Читайте также»: 6–8 статей. FAQ accordion. CTA 2 кнопки. Footer 3 ссылки+колонки. Цвета: bg #fff, primary #2D7FF9, text #000, muted #666. Карточки: border-radius 12px, shadow 0 2px 8px rgba(0,0,0,0.08). Чистый корпоративный.'
};
const TEST_BLOCK_MIN_LENGTH = 2500;

let apiKey = null;
let selectedModel = 'gemini-2.5-pro';
let generatedBlocks = [];
let isGenerating = false;

// DOM Elements
const apiKeyInput = document.getElementById('apiKey');
const modelSelect = document.getElementById('modelSelect');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const statusBar = document.getElementById('statusBar');
const statusText = document.getElementById('statusText');
const promptInput = document.getElementById('prompt');
const generateBtn = document.getElementById('generateBtn');
const testLargeBlocksBtn = document.getElementById('testLargeBlocksBtn');
const useTemplateBtn = document.getElementById('useTemplateBtn');
const templateStatus = document.getElementById('templateStatus');
const logContent = document.getElementById('logContent');
const logToggle = document.getElementById('logToggle');
const resultsSection = document.getElementById('resultsSection');
const blocksList = document.getElementById('blocksList');
const copyAllBtn = document.getElementById('copyAllBtn');
const messageEl = document.getElementById('message');

// Initialization
chrome.storage.local.get(['geminiApiKey', 'selectedModel', 'templateHtml'], (result) => {
  apiKey = result.geminiApiKey || null;
  if (result.selectedModel) {
    selectedModel = result.selectedModel;
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
    const preset = PRESETS[btn.dataset.preset];
    if (preset) {
      promptInput.value = preset;
      log(`Выбран пресет: ${btn.textContent.trim().split('\n')[0]}`);
    }
  });
});

// SVG Generator
let lastSvg = '';
const svgIconInput = document.getElementById('svgIconInput');
const svgAnimInput = document.getElementById('svgAnimInput');
const svgIconBtn = document.getElementById('svgIconBtn');
const svgAnimBtn = document.getElementById('svgAnimBtn');
const svgResult = document.getElementById('svgResult');
const svgPreview = document.getElementById('svgPreview');
const svgCopyBtn = document.getElementById('svgCopyBtn');

async function runSvgGen(type) {
  const prompt = (type === 'icon' ? svgIconInput : svgAnimInput).value.trim();
  if (!prompt) return;
  const btn = type === 'icon' ? svgIconBtn : svgAnimBtn;
  btn.disabled = true;
  btn.textContent = '…';
  try {
    const resp = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: type === 'icon' ? 'GENERATE_SVG_ICON' : 'GENERATE_SVG_ANIMATION',
        prompt,
        size: type === 'icon' ? 48 : undefined,
      }, (r) => resolve(r || {}));
    });
    if (resp.success && resp.svg) {
      lastSvg = resp.svg;
      svgResult.style.display = 'block';
      svgPreview.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.style.cssText = 'padding:12px;background:#fff;border-radius:6px;display:flex;align-items:center;justify-content:center;min-height:60px;';
      wrap.innerHTML = resp.svg;
      const svgEl = wrap.querySelector('svg');
      if (svgEl) {
        if (type === 'anim') { svgEl.setAttribute('width', '160'); svgEl.setAttribute('height', '100'); }
        else { svgEl.setAttribute('width', '48'); svgEl.setAttribute('height', '48'); }
      }
      svgPreview.appendChild(wrap);
      log(`SVG ${type === 'icon' ? 'иконка' : 'анимация'} сгенерирована`);
    } else {
      log(`SVG ошибка: ${resp.error || 'unknown'}`, true);
    }
  } finally {
    btn.disabled = false;
    btn.textContent = type === 'icon' ? 'Иконка' : 'Анимация';
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
    if (tabs[0]) {
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
    // Get template
    const templateResult = await chrome.storage.local.get(['templateHtml']);
    const templateHtml = templateResult.templateHtml || null;

    // Phase 1: Orchestrator
    log('🎨 Дизайн-агент создает план...');
    const plan = await getAgentPlan(prompt, templateHtml);
    log(`✓ План создан: ${plan.blocks.length} блоков`);

    // Phase 2: Generate blocks
    log('🔨 Начинаем параллельную генерацию всех блоков...');
    const generationPromises = plan.blocks.map(async (block, i) => {
      log(`� Агент начал работу над блоком ${i + 1}/${plan.blocks.length}: ${block.type}...`);
      try {
        const html = await generateBlock(plan.designSystem, block, i, plan.blocks.length);
        log(`✓ Блок ${i + 1} (${block.type}) готов`);
        return { index: i, type: block.type, html, success: true };
      } catch (err) {
        log(`❌ Ошибка блока ${i + 1}: ${err.message}`, true);
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
    log(`Ошибка: ${err.message}`, true);
    showMessage(err.message, 'error');
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
    const testBlocks = createLargeTestBlocks();

    testBlocks.forEach((block, index) => {
      const statusText = getCodeSizeLabel(block.html.length);
      generatedBlocks.push({ type: block.type, html: block.html });
      addBlockToResults(index, block.type, block.html, statusText);
      log(`✓ Тестовый блок ${index + 1}/7: ${block.type} (${statusText})`);
    });

    resultsSection.style.display = 'block';
    showMessage(`✓ Загружено ${testBlocks.length} больших тестовых блоков`, 'success');
  } catch (err) {
    log(`Ошибка тестовых блоков: ${err.message}`, true);
    showMessage(err.message, 'error');
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
function updateStatus(type, text) {
  statusBar.className = `status-bar ${type}`;
  statusBar.style.display = 'flex';
  statusText.textContent = text;

  const dot = statusBar.querySelector('.dot');
  dot.className = `dot ${type === 'ok' ? 'green' : type === 'error' ? 'red' : 'yellow'}`;
}

function log(msg, isError = false) {
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

function clearLog() {
  logContent.innerHTML = '';
}

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';

  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 5000);
}

function formatCodeSize(length) {
  return `${(length / 1024).toFixed(1)} KB`;
}

function getCodeSizeLabel(length) {
  const size = formatCodeSize(length);
  return length >= TEST_BLOCK_MIN_LENGTH ? `${size} code` : `${size} мало кода`;
}

function addBlockToResults(index, type, html, statusText = '✓ Готово') {
  const blockDiv = document.createElement('div');
  blockDiv.className = 'block-item';

  blockDiv.innerHTML = `
    <div class="block-header">
      <span class="block-type">${index + 1}. ${type.toUpperCase()}</span>
      <span class="block-status">${statusText}</span>
    </div>
    <div class="block-actions">
      <button class="copy-btn">📋 Копировать HTML</button>
      <button class="primary insert-btn">Вставить в Tilda</button>
    </div>
  `;

  const copyBtn = blockDiv.querySelector('.copy-btn');
  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(html).then(() => {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✓ Скопировано';
      setTimeout(() => copyBtn.textContent = originalText, 2000);
    });
  });

  const insertBtn = blockDiv.querySelector('.insert-btn');
  insertBtn.addEventListener('click', () => {
    insertBlock(html, insertBtn);
  });

  blocksList.appendChild(blockDiv);
}

function createLargeTestBlocks() {
  const palette = {
    primary: '#694be8',
    secondary: '#8167f0',
    accent: '#e9cc57',
    light: '#f8f7ff',
    dark: '#17132b',
    text: '#120f26',
    muted: '#6b6784'
  };

  const featureCards = [
    ['AI-стратегия', 'Собирает структуру страницы, тезисы и акценты под конкретный оффер за один прогон.'],
    ['SVG и анимации', 'Добавляет иконки, glow-эффекты, мягкие hover-сценарии и аккуратную глубину интерфейса.'],
    ['Tilda-ready HTML', 'На выходе получается код, который удобно вставлять блоками и сразу проверять в редакторе.'],
    ['Сценарии промптов', 'Можно быстро переключаться между кейсами: SaaS, агентства, портфолио, продукты и лендинги.'],
    ['Единая дизайн-система', 'Цвета, радиусы, тени и типографика живут в одном наборе и не расползаются между секциями.'],
    ['Поток тестирования', 'Проверочный режим помогает быстро гонять длинные HTML-блоки без вызовов Gemini API.']
  ];

  const metrics = [
    ['14 мин', 'Среднее время от идеи до первой версии страницы'],
    ['7 блоков', 'Полный тестовый сценарий для вставки по порядку'],
    ['0 ручных правок', 'Когда структура и стиль попадают в ожидание с первой попытки']
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
    ['Можно ли эти блоки вставлять в Tilda?', 'Да, они отображаются как обычные результаты генерации: можно копировать HTML или вставлять каждый блок отдельно.']
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
          ${metrics.map(([value, label]) => `
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
          <h2 style="font-size:48px;line-height:1.03;font-weight:800;letter-spacing:-0.03em;margin:0 0 14px;max-width:760px;">Кнопка проверки возвращена: теперь можно гонять 7 больших блоков перед реальным тестом с AI.</h2>
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

  const blocks = [
    { type: 'hero', html: heroHtml },
    { type: 'trust', html: trustHtml },
    { type: 'features', html: featuresHtml },
    { type: 'cases', html: casesHtml },
    { type: 'process', html: processHtml },
    { type: 'faq', html: faqHtml },
    { type: 'cta', html: ctaHtml }
  ];

  const tooSmall = blocks.filter(block => block.html.length < TEST_BLOCK_MIN_LENGTH);
  if (tooSmall.length > 0) {
    throw new Error(`Тестовые блоки слишком короткие: ${tooSmall.map(block => block.type).join(', ')}`);
  }

  return blocks;
}

function insertBlock(html, btnEl) {
  const originalText = btnEl.textContent;
  btnEl.textContent = 'Вставляем...';
  btnEl.disabled = true;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
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
async function getAgentPlan(prompt, templateHtml) {
  const response = await sendRuntimeMessage({
    type: 'AGENT_PLAN',
    prompt,
    templateHtml,
  });

  if (!response.success || !response.plan) {
    throw new Error(response.error || 'Ошибка планирования');
  }

  return response.plan;
}

async function generateBlock(designSystem, block, index, total) {
  const response = await sendRuntimeMessage({
    type: 'AGENT_BLOCK',
    designSystem,
    block,
    blockIndex: index,
    totalBlocks: total,
  });

  if (!response.success || !response.html) {
    throw new Error(response.error || `Ошибка генерации блока ${index + 1}`);
  }

  return response.html;
}

function sendRuntimeMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => resolve(response || {}));
  });
}