// Tilda Space AI - Popup Script

const PRESETS = {
  kvai: 'Лендинг для AI-сервиса: hero с фиолетовым градиентом #694be8, преимущества, модули/тарифы с иконками, FAQ аккордеон с желтой рамкой #e9cc57, отзывы, CTA, footer. Стиль: фиолетовый основной #694be8, желтый акцент #e9cc57, белый текст, современный premium',
  startup: 'Лендинг для IT-стартапа: SaaS платформа для управления проектами. Нужны hero, преимущества, о продукте, тарифы, отзывы, CTA, footer. Стиль: минималистичный, тёмный, как Linear или Vercel',
  cafe: 'Лендинг для кофейни: уютная атмосфера, авторские напитки. Hero с фото, меню, о нас, галерея, отзывы, контакты, footer. Стиль: тёплый, кремовый, уютный',
  portfolio: 'Портфолио дизайнера: минималистичный стиль. Hero с именем, галерея работ, обо мне, навыки, контактная форма, footer. Стиль: чистый, белый, с акцентами',
  fitness: 'Лендинг фитнес-клуба: энергичный дизайн. Hero, направления, расписание, тренеры, тарифы, отзывы, footer. Стиль: яркий, энергичный, с оранжевыми акцентами'
};

const ORCHESTRATOR_PROMPT = `You are a web design orchestrator AI. Given a user request for a website page, you must:

1. Create a DESIGN SYSTEM (color palette, typography, spacing, button styles) that will be shared across ALL blocks
2. Plan the page structure as a list of blocks

Return a JSON object with this EXACT structure (no markdown, no code fences):
{
  "designSystem": {
    "primaryColor": "#hex",
    "secondaryColor": "#hex",
    "accentColor": "#hex",
    "bgLight": "#hex (light background for alternating sections)",
    "bgDark": "#hex (dark background for hero/CTA)",
    "textColor": "#hex (main text)",
    "textMuted": "#hex (secondary text)",
    "fontFamily": "'Inter', system-ui, -apple-system, sans-serif",
    "headingStyle": "font-weight: 800; letter-spacing: -0.02em;",
    "buttonStyle": "padding: 16px 40px; border-radius: 12px; font-weight: 600; font-size: 16px;",
    "borderRadius": "16px",
    "sectionPadding": "100px 20px"
  },
  "blocks": [
    { "type": "hero", "description": "..." },
    { "type": "features", "description": "..." },
    { "type": "about", "description": "..." },
    { "type": "testimonials", "description": "..." },
    { "type": "cta", "description": "..." },
    { "type": "footer", "description": "..." }
  ]
}

Rules:
- Choose a COHESIVE, PREMIUM color palette. Think Stripe, Linear, Vercel.
- Plan 4-7 blocks depending on the request.
- Each block description should be detailed: content, layout, specific elements.
- For Russian prompts, write descriptions in Russian.
- Return ONLY the JSON. No explanation.`;

const ORCHESTRATOR_TEMPLATE_ADDON = `

IMPORTANT - REFERENCE TEMPLATE:
The user provided HTML of a reference page below. You MUST:
- Extract the visual style from it: colors (hex), typography, spacing, button style.
- Put those colors into your designSystem (primaryColor, secondaryColor, accentColor, bgLight, bgDark, textColor, textMuted).
- Match the structure: if the reference has hero, features, CTA, footer — plan similar blocks.
- Return ONLY the JSON. No explanation.`;

const MAX_TEMPLATE_CHARS = 12000;

let apiKey = null;
let generatedBlocks = [];
let isGenerating = false;

// DOM Elements
const apiKeyInput = document.getElementById('apiKey');
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
chrome.storage.local.get(['geminiApiKey', 'templateHtml'], (result) => {
  apiKey = result.geminiApiKey || null;
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
  if (key) {
    chrome.storage.local.set({ geminiApiKey: key }, () => {
      apiKey = key;
      updateStatus('ok', '✓ API ключ сохранен');
      generateBtn.disabled = false;
      showMessage('API ключ успешно сохранен', 'success');
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
    for (let i = 0; i < plan.blocks.length; i++) {
      const block = plan.blocks[i];
      log(`🔨 Блок ${i + 1}/${plan.blocks.length}: ${block.type}...`);
      
      const html = await generateBlock(plan.designSystem, block, i, plan.blocks.length);
      generatedBlocks.push({ type: block.type, html });
      
      addBlockToResults(i, block.type, html);
      log(`✓ Блок ${i + 1} готов`);
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
  
  blockDiv.innerHTML = \`
    <div class="block-header">
      <span class="block-type">\${index + 1}. \${type.toUpperCase()}</span>
      <span class="block-status">✓ Готово</span>
    </div>
    <div class="block-actions">
      <button class="copy-btn">📋 Копировать HTML</button>
      <button class="primary insert-btn">Вставить в Tilda</button>
    </div>
  \`;
  
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
  let fullPrompt = ORCHESTRATOR_PROMPT + \`\n\nUSER REQUEST: \${prompt}\`;
  
  if (templateHtml) {
    const cleanHtml = templateHtml.substring(0, MAX_TEMPLATE_CHARS);
    fullPrompt += ORCHESTRATOR_TEMPLATE_ADDON + \`\n\nTEMPLATE HTML:\n\${cleanHtml}\`;
  }

  const responseText = await callGemini(fullPrompt);
  
  try {
    let jsonStr = responseText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    throw new Error('Оркестратор вернул неверный формат плана');
  }
}

async function generateBlock(designSystem, block, index, total) {
  const dsStr = JSON.stringify(designSystem, null, 2);
  const prompt = \`You are an expert Tilda UI block developer.
Generate HTML/CSS for block type: \${block.type} (Block \${index + 1} of \${total})
Block Description: \${block.description}

DESIGN SYSTEM (MUST STRICTLY FOLLOW THESE COLORS AND STYLES):
\${dsStr}

Requirements:
1. Return ONLY pure HTML with inline <style> OR a single <style> block at the top.
2. The UI MUST look highly professional, premium, and modern.
3. USE the provided colors. If primaryColor is purple, the buttons or accents MUST be purple.
4. Ensure text contrast (white text on dark backgrounds, dark text on light backgrounds).
5. Add hover effects for buttons.
6. NO Markdown fences in output. Just the raw HTML string.\`;

  const responseText = await callGemini(prompt);
  return responseText.replace(/\`\`\`html/g, '').replace(/\`\`\`/g, '').trim();
}

async function callGemini(prompt) {
  const url = \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=\${apiKey}\`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
      }
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'Ошибка API Gemini');
  }

  const data = await response.json();
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error('Пустой ответ от Gemini');
  }

  return data.candidates[0].content.parts[0].text;
}