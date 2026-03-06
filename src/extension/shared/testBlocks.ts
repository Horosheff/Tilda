export interface TestBlock {
    type: string;
    html: string;
}

export function createLargeTestBlocks(minLength = 1500): TestBlock[] {
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

    const tooSmall = blocks.filter((block) => block.html.length < minLength);
    if (tooSmall.length > 0) {
        throw new Error(`Тестовые блоки слишком короткие: ${tooSmall.map((block) => block.type).join(', ')}`);
    }

    return blocks;
}
