# ACE Editor и Tilda Space AI

## Что такое ACE Editor

**ACE (Ajax.org Cloud9 Editor)** — встраиваемый браузерный редактор кода на JavaScript. Его используют VSCode (через Monaco), Cloud9 IDE, Tilda (блок T123), CodePen и сотни других проектов.

### Возможности
- Подсветка синтаксиса для 120+ языков
- Темы (Monokai, GitHub, Nord и др.)
- Поддержка до 4 млн строк
- Поиск и замена, множественные курсоры
- Режимы Vim/Emacs
- Сворачивание кода, автодополнение

### Где используется
- **Tilda** — блок T123 «HTML-код» 
- **CodePen, JSFiddle** — редакторы примеров
- **Cloud9 IDE, Cursor** — основа редакторов
- Любой сайт, где нужен редактор кода

---

## Как мы используем ACE в расширении

Tilda подключает ACE на странице редактора. Нам не нужно встраивать ACE — мы **подключаемся к уже созданному редактору**.

### Официальный способ доступа

ACE хранит ссылку на инстанс в DOM-элементе:

```javascript
// Каждый ACE-редактор имеет класс ace_editor
const aceEl = document.querySelector('.ace_editor');
const editor = aceEl.env.editor;  // ссылка на редактор

editor.setValue('<div>Мой HTML</div>');  // установить содержимое
editor.getValue();  // получить содержимое
```

Это **надёжный способ**: не зависит от глобальной переменной `ace`, работает при любом способе бандлинга Tilda.

### Альтернатива: ace.edit()

```javascript
// По ID элемента (Tilda: pre#aceeditor1234567890)
const editor = ace.edit('aceeditor1234567890');
editor.setValue(html);
```

Работает только если `ace` доступен глобально.

---

## Алгоритм вставки в content.ts

1. Найти `.ace_editor` или `.ace_content`
2. Проверить `element.env.editor`
3. Вызвать `editor.setValue(html)`
4. Fallback: `ace.edit(elementId)` если доступен глобальный `ace`
5. Fallback: `execCommand('paste')` если буфер уже заполнен

---

## Полезные ссылки

- [ACE GitHub](https://github.com/ajaxorg/ace)
- [ACE API](https://ace.c9.io/api/)
- [Embedding Guide](https://github.com/ajaxorg/ace/wiki/Embedding---API)
