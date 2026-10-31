# Kimi Sheets Bridge

Бесплатный HTTPS-мост к Google Sheets через **Google Apps Script Web App**.
Чтение и запись ячеек, листы, создание таблиц — JSON-запросами с токеном.
**Не нужны** Google Cloud Console, OAuth-клиент, сервисный аккаунт и биллинг.

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

`sheet` необязателен — по умолчанию первый лист. Ответ всегда JSON,
ошибки — `{"error": "..."}`.

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

## Особенности

- POST к `/exec` возвращает 302 на `script.googleusercontent.com`: тело POST
  при авто-редиректе теряется (curl → 411 Length Required). Клиент следует
  редиректу вручную. Голый curl: сначала POST без `-L`, затем GET по `Location`.
- Кириллицу в JSON передавать только в UTF-8; curl из консоли Windows портит
  кодировку — для записей используйте клиент.
- Мост работает только со значениями. Форматирование ячеек не поддерживается.
- Лимиты — стандартные квоты Apps Script (для ручной работы и отчётов хватает).
