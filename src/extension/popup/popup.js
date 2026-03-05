// Tilda Space AI - Popup Script

const PRESETS = {
  kvai: 'Лендинг для AI-сервиса: hero с фиолетовым градиентом #694be8, преимущества, модули/тарифы с иконками, FAQ аккордеон с желтой рамкой #e9cc57, отзывы, CTA, footer. Стиль: фиолетовый основной #694be8, желтый акцент #e9cc57, белый текст, современный premium',
  startup: 'Лендинг для IT-стартапа: SaaS платформа для управления проектами. Нужны hero, преимущества, о продукте, тарифы, отзывы, CTA, footer. Стиль: минималистичный, тёмный, как Linear или Vercel',
  cafe: 'Лендинг для кофейни: уютная атмосфера, авторские напитки. Hero с фото, меню, о нас, галерея, отзывы, контакты, footer. Стиль: тёплый, кремовый, уютный',
  portfolio: 'Портфолио дизайнера: минималистичный стиль. Hero с именем, галерея работ, обо мне, навыки, контактная форма, footer. Стиль: чистый, белый, с акцентами',
  fitness: 'Лендинг фитнес-клуба: энергичный дизайн. Hero, направления, расписание, тренеры, тарифы, отзывы, footer. Стиль: яркий, энергичный, с оранжевыми акцентами',
  yandex: 'Yandex Metrika Style (yandex.ru/adv/metrika). Hero: H1 40–48px + subline + CTA + stat-badge. Feature-duo: 2 карточки иконка+заголовок+текст. Grid «Возможности»: 5–6 карточек-ссылок. Stats: 3 числа (9 млн, 1.6 млн, 120). News: 3 карточки дата+заголовок+excerpt. Promo-block тёмный + CTA. «Читайте также»: 6–8 статей. FAQ accordion. CTA 2 кнопки. Footer 3 ссылки+колонки. Цвета: bg #fff, primary #2D7FF9, text #000, muted #666. Карточки: border-radius 12px, shadow 0 2px 8px rgba(0,0,0,0.08). Чистый корпоративный.'
};

const ORCHESTRATOR_PROMPT = `You are a senior web copywriter AND design orchestrator. Your job: given a user request, create a complete plan for a professional landing page.

YOU MUST:
1. Create a PREMIUM, COHESIVE DESIGN SYSTEM inspired by Stripe/Linear/Vercel. Bold colors, modern typography.
2. Plan 5-6 logical page sections (hero, features, benefits, testimonials, CTA, footer).
3. WRITE THE ACTUAL COPY IN RUSSIAN FOR EVERY BLOCK — real headlines, real subheadlines, real body text, real button labels, real feature names with descriptions, real testimonials with names. If the request is in Russian, everything must be in Russian.

CRITICAL RULE: Each block "description" field MUST contain the REAL TEXT that will appear on the page. Do NOT write abstract descriptions like "hero with title". WRITE THE ACTUAL TEXT like this:
  "hero": "Заголовок: 'Автоматизируйте бизнес с Ковчег AI'. Подзаголовок: 'Мощные инструменты на базе нейросетей для роста вашего дела'. Кнопка: 'Начать бесплатно'. Маленький значок доверия: 'Уже 5000+ клиентов'"

FOR EACH BLOCK TYPE:
- hero: H1 headline (compelling, 5-10 words), subheadline (15-25 words), 1-2 CTA buttons, 1-2 social proof badges
- features: Section title, 3-6 features each with: icon description, feature name (2-4 words), feature benefit (1-2 sentences)
- benefits/about: Section title, 2-3 paragraphs of real persuasive text, key stats (3 numbers with labels)
- testimonials: 2-3 testimonials each with: customer name, role/company, quote (2-3 sentences)
- pricing/cta: Headline, subtext, button label, optional urgency text
- footer: Company name, 2-3 navigation link groups, copyright text

Return ONLY this JSON (no markdown, no code fences, no explanation):
{
  "designSystem": {
    "primaryColor": "#hex",
    "secondaryColor": "#hex",
    "accentColor": "#hex",
    "bgLight": "#hex",
    "bgDark": "#hex",
    "textColor": "#hex",
    "textMuted": "#hex",
    "fontFamily": "'Inter', system-ui, sans-serif",
    "headingStyle": "font-weight: 800; letter-spacing: -0.02em;",
    "buttonStyle": "padding: 14px 36px; border-radius: 10px; font-weight: 600; font-size: 16px;",
    "borderRadius": "12px",
    "sectionPadding": "80px 20px"
  },
  "blocks": [
    { "type": "hero", "description": "[REAL headline, subheadline, button text, social proof HERE]" },
    { "type": "features", "description": "[REAL section title and 4 features with names and descriptions HERE]" },
    { "type": "benefits", "description": "[REAL persuasive text, stats, and proof points HERE]" },
    { "type": "testimonials", "description": "[REAL testimonials with names, companies, quotes HERE]" },
    { "type": "cta", "description": "[REAL CTA headline and button text HERE]" },
    { "type": "footer", "description": "[REAL footer links and copyright HERE]" }
  ]
}

Return ONLY the JSON. No explanation. No markdown fences.`;

const ORCHESTRATOR_TEMPLATE_ADDON = `

IMPORTANT - REFERENCE TEMPLATE:
The user provided HTML of a reference page below. You MUST:
- Extract the visual style from it: colors (hex), typography, spacing, button style.
- Put those colors into your designSystem (primaryColor, secondaryColor, accentColor, bgLight, bgDark, textColor, textMuted).
- Match the structure: if the reference has hero, features, CTA, footer — plan similar blocks.
- Return ONLY the JSON. No explanation.`;

const MAX_TEMPLATE_CHARS = 12000;

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
    generateBtn.textContent = '🤖 Запустить агентов';
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

function addBlockToResults(index, type, html) {
  const blockDiv = document.createElement('div');
  blockDiv.className = 'block-item';

  blockDiv.innerHTML = `
    <div class="block-header">
      <span class="block-type">${index + 1}. ${type.toUpperCase()}</span>
      <span class="block-status">✓ Готово</span>
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
  let fullPrompt = ORCHESTRATOR_PROMPT + `\n\nUSER REQUEST: ${prompt}`;

  if (templateHtml) {
    const cleanHtml = templateHtml.substring(0, MAX_TEMPLATE_CHARS);
    fullPrompt += ORCHESTRATOR_TEMPLATE_ADDON + `\n\nTEMPLATE HTML:\n${cleanHtml}`;
  }

  const responseText = await callGemini(fullPrompt);
  try {
    let cleanStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (jsonMatch) {
      cleanStr = jsonMatch[1];
    } else {
      const firstBrace = responseText.indexOf('{');
      const lastBrace = responseText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanStr = responseText.substring(firstBrace, lastBrace + 1);
      }
    }
    const plan = JSON.parse(cleanStr.trim());
    return plan;
  } catch (err) {
    throw new Error('Некорректный JSON от оркестратора');
  }
}

async function generateBlock(designSystem, block, index, total) {
  const ds = designSystem;
  const prompt = `You are a professional HTML/CSS developer building a Tilda landing page block.

BLOCK TO BUILD: ${block.type} (section ${index + 1} of ${total})

CONTENT (use EXACTLY this text on the page, word-for-word):
${block.description}

DESIGN COLORS:
- Primary: ${ds.primaryColor}
- Secondary: ${ds.secondaryColor}
- Accent: ${ds.accentColor}
- Background light: ${ds.bgLight}
- Background dark: ${ds.bgDark}
- Text: ${ds.textColor}
- Muted text: ${ds.textMuted}
- Font: ${ds.fontFamily}
- Border radius: ${ds.borderRadius}
- Section padding: ${ds.sectionPadding}

HARD RULES — violating any of these causes a broken page:
1. Output ONLY one \`\`\`html...\`\`\` block. Nothing else. No explanations, no comments outside the block.
2. ALL HTML tags must be properly closed. Every <div> needs </div>. Every <p> needs </p>.
3. Use ONLY inline CSS or a single <style> tag. No external stylesheets, no classes from frameworks.
4. The section MUST contain the text from the CONTENT block above. Do NOT leave it empty or use Lorem ipsum.
5. Make text visible: use ${ds.textColor} or white on dark sections, ensure high contrast.
6. Wrap everything in <section style="padding: ${ds.sectionPadding}; background: [appropriate color]; font-family: ${ds.fontFamily}; box-sizing: border-box;">.
7. Use max-width: 1200px; margin: 0 auto; padding: 0 20px; for inner container.
8. Make it responsive with flexbox or CSS grid. Never use fixed pixel widths > 1200px.

QUALITY REQUIREMENTS:
- Premium, modern look. Not bootstrap-default.
- Add hover transitions (0.3s ease) on buttons and cards.
- Use box-shadow, border-radius (${ds.borderRadius}), and gradients sparingly for depth.
- Buttons: background ${ds.primaryColor}, color white, ${ds.buttonStyle || 'padding: 14px 36px; border-radius: 10px; font-weight: 600;'}, cursor: pointer.

Now output the complete HTML block:`;

  const responseText = await callGemini(prompt, true);

  // Remove <think> tags completely
  let cleanText = responseText.replace(/<think>[\s\S]*?<\/think>/gi, '');

  // Find all code blocks
  const matches = [...cleanText.matchAll(/```[a-z]*\s*([\s\S]*?)\s*```/gi)];

  if (matches && matches.length > 0) {
    // If the LLM returned multiple code blocks, concatenate them just in case
    return matches.map(m => m[1].trim()).join('\n\n');
  }

  // Fallback: aggressive extraction if no markdown blocks
  const firstAngle = cleanText.indexOf('<');
  const lastAngle = cleanText.lastIndexOf('>');
  if (firstAngle !== -1 && lastAngle !== -1) {
    return cleanText.substring(firstAngle, lastAngle + 1).trim();
  }

  return cleanText.trim();
}

async function callGemini(prompt, isCodeGen = false) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: isCodeGen ? 0.4 : 0.7,
      maxOutputTokens: isCodeGen ? 8192 : 4096,
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Ошибка API Gemini');
  }

  const data = await response.json();
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error('Пустой ответ от Gemini');
  }

  // Collect all parts (Gemini may split text across parts)
  const text = data.candidates[0].content.parts
    .filter(p => p.text)
    .map(p => p.text)
    .join('');

  return text;
}