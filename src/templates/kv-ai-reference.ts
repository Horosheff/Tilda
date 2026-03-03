/**
 * Эталон дизайна страницы kv-ai.ru (реальный экспорт Tilda).
 * HTML и стили для генерации похожих страниц.
 */
const MAX_TEMPLATE = 11500;

/** Реальный фрагмент HTML страницы kv-ai.ru (header + hero + блоки) */
const KV_AI_REAL_HTML = `<!--allrecords--> <div id="allrecords" class="t-records"> <header id="t-header" class="t-records"> <div id="rec829499493" class="r t-rec t-screenmin-980px" data-record-type="396"> <div class='t396'> <div class="t396__artboard" data-artboard-height="100"> <div class='t396__elem tn-elem' data-elem-type='text'> <div class='tn-atom'><a href="/" style="color: inherit">ковчег</a></div> </div> <div class='t396__elem tn-elem' data-elem-type='text'> <div class='tn-atom'><a href="/" style="color: inherit"><span style="color: rgb(242, 211, 90);">нейросети</span></a></div> </div> <div class='t396__elem tn-elem' data-elem-type='shape'> <a class='tn-atom' href="https://t.me/maya_pro"> </a> </div> <div class='tn-atom'><a href="https://t.me/maya_pro" style="color: inherit">сообщество</a></div> </div> </div> </div> </header> <div id="rec1739108721" class="r t-rec t-rec_pt_0" data-record-type="396"> <style>#rec1739108721 .t396__artboard {height:1060px;background-color:#694be8;} .tn-atom{color:#ffffff;font-size:20px;font-family:'Roboto',Arial,sans-serif;font-weight:500;} .tn-atom span{color:#f2d35a;} </style> <div class='t396'> <div class="t396__artboard" data-artboard-height="1060" style="background-color:#694be8;"> <div class='t396__elem' data-elem-type='text'> <h2 class='tn-atom' style="color:#eaeaea;font-size:100px;font-family:'maya',Arial,sans-serif;font-weight:600;">кастомный модуль</h2> </div> <div class='t396__elem' data-elem-type='text'> <h2 class='tn-atom' style="color:#f2d45c;font-size:200px;font-family:'Roboto';font-weight:700;">MAX </h2> </div> <div class='t396__elem' data-elem-type='text'> <h2 class='tn-atom' style="color:#eeeeee;font-size:23px;">Создавайте чат-ботов, автоворонки, автопостинг для Мессенджера MAX в Make</h2> </div> <div class='t396__elem' data-elem-type='shape'> <a class='tn-atom' href="https://t.me/maya_pro" style="border-radius:50px;background-color:#000000;opacity:0.7;color:#ffffff;"> </a> </div> <div class='tn-atom'><a href="https://t.me/maya_pro" style="color: inherit">связаться</a></div> <div class='t396__elem' data-elem-type='shape' style="border-radius:32px;background-color:#252525;"> <a class='tn-atom' href="https://t.me/maya_pro"> </a> </div> <h3 class='tn-atom' style="color:#e4e4e4;font-size:30px;font-weight:200;">вступить в комьюнити</h3> <div class='t396__elem' style="border-radius:3000px;background-color:#f2d35a;"></div> </div> </div> </div> <div id="rec1739108741" class="r t-rec t-rec_pt_135 t-rec_pb_165" style="padding-top:135px;padding-bottom:165px;background-color:#694be8;"> <div class="t849"> <div class="t849__header" style="border-top: 3px solid #e9cc57"> <span class="t849__title t-name t-name_xl" style="font-size:22px;color:#ffffff;font-family:'Roboto';font-weight:500;">MAX модуль: Отслеживать сообщения (webhook)</span> </div> <div class="t849__content"> <div class="t849__text t-descr t-descr_sm" style="color:#fbfbfb;">Webhook-триггер для отслеживания сообщений в чатах.</div> </div> </div> </div> <div id="rec1739108771" class="r t-rec" data-record-type="396"> <style>#rec1739108771 .t396__artboard {height:360px;background-color:#694be8;} .tn-atom{background-color:#f2d35a;border-radius:43px;} </style> <div class='t396'> <div class="t396__artboard" style="height:360px;background-color:#694be8;"> <div class='t396__elem' style="border-radius:43px;background-color:#f2d35a;"> </div> <div class='t396__elem' style="border-radius:32px;background-color:#8167f0;"> <a class='tn-atom' href="/oferta"> </a> </div> <div class='tn-atom' style="color:#000000;font-size:20px;">Хорошев Артур Олегович<br />ИНН: 500117350096</div> <div class='tn-atom'><a href="/oferta" style="color:#ffffff;"><u>публичная оферта</u></a></div> </div> </div> </div>`;

export const KV_AI_DESIGN_REFERENCE = `
DESIGN REFERENCE: kv-ai.ru (real page)
- Background hero/sections: #694be8 (purple)
- Accent text: #f2d35a, #e9cc57 (gold/yellow)
- Accent links: #ff8562 (coral); buttons CTA: #704df0, #8167f0 (purple)
- Buttons pill: black #000000 opacity 0.7, white text; or #252525 dark; or #f2d35a yellow
- Text on dark: #ffffff, #eaeaea, #eeeeee, #e4e4e4
- Font: 'maya', 'Roboto', Arial; headings 100px/200px hero, 22-30px titles, 18-23px body
- Section padding: 135px top, 165px bottom (t-rec_pt_135 t-rec_pb_165)
- Border radius: 50px pills, 32px cards, 43px yellow CTA bar
- Accordion border-top: 3px solid #e9cc57
`;

/** HTML-фрагмент в стиле kv-ai для контекста ИИ */
export const KV_AI_HTML_SNIPPET =
  KV_AI_REAL_HTML.length > MAX_TEMPLATE
    ? KV_AI_REAL_HTML.slice(0, MAX_TEMPLATE) + '\n...[truncated]'
    : KV_AI_REAL_HTML;

/** Полный эталон для передачи в ИИ */
export const KV_AI_TEMPLATE_HTML = KV_AI_DESIGN_REFERENCE + '\n\nREFERENCE PAGE HTML:\n' + KV_AI_HTML_SNIPPET;
