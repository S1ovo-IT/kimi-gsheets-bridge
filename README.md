# Kimi Sheets Bridge

Бесплатный HTTPS-мост к Google Sheets через **Google Apps Script Web App**.
Чтение и запись ячеек, листы, создание таблиц, оформление, графики —
JSON-запросами с токеном. **Не нужны** Google Cloud Console, OAuth-клиент,
сервисный аккаунт и биллинг.

## Как развернуть (5 минут)

1. Откройте [script.google.com](https://script.google.com) → «Новый проект».
2. Вставьте в `Code.gs` содержимое из этого репозитория.
3. Замените `REPLACE_WITH_YOUR_OWN_RANDOM_TOKEN` на свою случайную строку
   (например, 48 hex-символов). Это единственная защита моста — не публикуйте токен.
4. «Начать развертывание» → «Новое развертывание» → тип **Веб-приложение**:
   - Запуск от имени: **Моего**;
   - У кого есть доступ: **Все** (доступ закрыт токеном).
5. «Предоставить доступ» → в предупреждении Google: Advanced →
   «Go to … (unsafe)» → Continue (это ваш собственный скрипт).
6. Скопируйте URL веб-приложения (`.../exec`).

При изменении кода: сохранить → «Управление развертываниями» → карандаш →
«Новая версия» → «Начать развертывание». URL остаётся прежним.

## API

| Действие | Запрос |
|---|---|
| Список листов | `GET ?token=&id=&action=list` |
| Чтение | `GET ?token=&id=[&sheet=][&range=A1:Z100]` |
| Запись диапазона | `POST {token, id, sheet?, range, values:[[...]]}` |
| Добавить строки | `POST {token, id, action:"append", sheet?, values:[[...]]}` |
| Новый лист | `POST {token, id, action:"createSheet", name}` |
| Новая таблица | `POST {token, action:"createSpreadsheet", title}` |
| Оформление | `POST {token, id, action:"format", sheet?, formats, widths, frozenRows, frozenColumns}` |
| Графики | `POST {token, id, action:"chart", sheet?, charts}` |
| Удалить графики | `POST {token, id, action:"clearCharts", sheet?}` |

`sheet` необязателен — по умолчанию первый лист. Ответ всегда JSON,
ошибки — `{"error": "..."}`.

### format

```json
{
  "formats": [
    {"range": "A1:Y1", "bold": true, "background": "#263238", "color": "#ffffff"},
    {"range": "A4:E14", "border": true},
    {"range": "B2:Y10", "numberFormat": "#,##0"}
  ],
  "widths": [{"column": 1, "width": 330}],
  "frozenColumns": 1
}
```

Поля `formats[]`: `range`, `bold`, `background`, `color`, `numberFormat`,
`fontSize`, `horizontalAlignment`, `wrap`, `border`. Округление делается через
`numberFormat` (`#,##0` — целые рубли), значения остаются точными.

### chart

```json
{
  "charts": [
    {"title": "Прибыль по месяцам", "type": "LINE",
     "ranges": ["A100:D124"], "headers": 1, "row": 56, "col": 1,
     "width": 760, "height": 380}
  ]
}
```

Типы: `LINE`, `COLUMN`, `AREA`, `BAR`. Рабочий рецепт для нескольких серий:
собрать служебную непрерывную таблицу «категория | серия1 | серия2…»
(можно формулами-ссылками) и строить график по ней с `headers: 1`.
Несмежные диапазоны + `transpose` дают неверные серии.

## Python-клиент

```bash
python gsheets.py list <spreadsheetId>
python gsheets.py read <spreadsheetId> A1:D20 --sheet "Лист1"
python gsheets.py write <spreadsheetId> A1:B2 '[["a","b"],["c","d"]]'
python gsheets.py append <spreadsheetId> '[["строка","значение"]]'
python gsheets.py create-sheet <spreadsheetId> "Новый лист"
python gsheets.py create-spreadsheet "Название таблицы"
```

Клиент берёт URL и токен из JSON-файла (путь в `SECRETS_PATH`, по умолчанию
`F:\Work\_secrets\gsheets-bridge.json`):

```json
{"url": "https://script.google.com/macros/s/.../exec", "token": "..."}
```

Для `format`/`chart` и других действий удобно импортировать модуль:
`gsheets._post({"id": ..., "action": "format", ...})`.

## Особенности

- POST к `/exec` возвращает 302 на `script.googleusercontent.com`: тело POST
  при авто-редиректе теряется (curl → 411 Length Required). Клиент следует
  редиректу вручную. Голый curl: сначала POST без `-L`, затем GET по `Location`.
- Кириллицу в JSON передавать только в UTF-8; curl из консоли Windows портит
  кодировку — для записей используйте клиент.
- `setValues` требует прямоугольный массив: дополняйте строки `""` до ширины
  диапазона.
- Формулы передавать строками `=...` в `values` — Sheets их вычисляет.
  Локаль ru_RU: дроби в формулах с запятой (`*0,8`), разделитель аргументов `;`.
- Лимиты — стандартные квоты Apps Script (для ручной работы и отчётов хватает).
