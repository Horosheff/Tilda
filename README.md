# Tilda Space

Приложение для создания страниц сайта в стиле Tilda: визуальный конструктор блоков и экспорт в HTML с опциональной интеграцией Tilda API.

## О проекте

Tilda Space — это инструмент, который позволяет:

- **Собирать страницу визуально** из блоков (заголовки, текст, изображения, кнопки, колонки, формы).
- **Экспортировать** готовую страницу в HTML (для вставки в Tilda или размещения на своём сервере).
- **Подключать Tilda API** (тариф Business Plan): просмотр проектов и страниц, экспорт уже созданных в Tilda страниц.

> Официальный [Tilda API](https://help.tilda.cc/api) не предоставляет создания новых страниц — только чтение и экспорт. Поэтому приложение выступает как конструктор с экспортом и, при необходимости, как просмотр/экспорт существующих страниц Tilda.

## План и архитектура

Подробный план, исследование API и этапы реализации — в [PLAN.md](./PLAN.md).

## Быстрый старт (после реализации MVP)

```bash
npm install
npm run dev
```

Откройте в браузере указанный в терминале адрес (обычно `http://localhost:5173`).

## Требования к Tilda API

- Тариф [Tilda Business Plan](https://tilda.cc/pricing/).
- Ключи: **Site Settings → Export → API Integration** (Public Key и Secret Key).
- Лимит: 150 запросов в час.

## Репозиторий

[https://github.com/Horosheff/Tilda](https://github.com/Horosheff/Tilda)

## Ссылки

- [Tilda API](https://help.tilda.cc/api)
- [Tilda Help Center](https://help.tilda.cc/)
- [Tilda Zero Block](https://help.tilda.cc/zero)
