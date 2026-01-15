# Миграция на ES-модули - Завершена

## Выполненные изменения

### 1. package.json
- ✅ Изменен `"type": "module"` (было `"commonjs"`)

### 2. Main Process файлы (src/main/)
Все файлы мигрированы на ES-модули:

- ✅ **main.js** - точка входа
  - Заменены все `require` на `import`
  - Добавлен `__dirname` через `import.meta.url`
  - Импорт `http` для использования в функциях

- ✅ **fileManager.js**
  - Мигрирован на ES-модули
  - Динамический импорт `matchMigration.js` через `await import()`
  - Добавлен `__dirname` через `import.meta.url`

- ✅ **logoManager.js**
  - Мигрирован на ES-модули
  - Добавлен `__dirname` через `import.meta.url`

- ✅ **server.js**
  - Мигрирован на ES-модули
  - Использует `createRequire()` для динамического доступа к `electron`
  - Импорт `fs/promises` в начале файла

- ✅ **settingsManager.js**
  - Мигрирован на ES-модули
  - Добавлен `__dirname` через `import.meta.url`

- ✅ **vmix-client.js**
  - Мигрирован на ES-модули

- ✅ **vmix-config.js**
  - Мигрирован на ES-модули

- ✅ **vmix-field-migration.js**
  - Мигрирован на ES-модули

- ✅ **vmix-input-configs.js**
  - Мигрирован на ES-модули

- ✅ **utils/domUtils.js**
  - Мигрирован на ES-модули

- ✅ **preload.js** → **preload.cjs**
  - Переименован в `.cjs` для явного указания CommonJS
  - Electron требует CommonJS для preload скриптов
  - Обновлены пути в `main.js`

- ✅ **scripts/wait-for-vite.js**
  - Мигрирован на ES-модули
  - Добавлен `__dirname` через `import.meta.url`

- ✅ **scripts/analyze-test-results.js**
  - Мигрирован на ES-модули

### 3. Shared файлы (src/shared/)
Убраны CommonJS экспорты, оставлены только ES-модули:

- ✅ **errorHandler.js** - изменен на `export default`
- ✅ **matchUtils.js** - изменен на именованные экспорты
- ✅ **volleyballRules.js** - убран CommonJS экспорт
- ✅ **vmix-field-utils.js** - убран CommonJS экспорт
- ✅ **matchMigration.js** - убран CommonJS экспорт

## Особенности миграции

### Использование __dirname и __filename
В ES-модулях нет `__dirname` и `__filename`. Добавлено в каждый файл:
```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### Расширения .js в импортах
Все относительные импорты теперь требуют расширения `.js`:
```javascript
import module from './module.js'; // Обязательно .js
```

### Именованные vs Default экспорты
- Модули с несколькими экспортами используют `import * as moduleName`
- Модули с одним экспортом используют `import moduleName`

### Динамические импорты
Для динамической загрузки модулей используется `await import()`:
```javascript
const module = await import('./module.js');
```

### createRequire для CommonJS зависимостей
Для доступа к `electron` в некоторых контекстах используется:
```javascript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { app } = require('electron');
```

## Проверка

- ✅ Все файлы мигрированы
- ✅ Все импорты используют расширения .js
- ✅ Все экспорты обновлены
- ✅ preload.cjs создан для CommonJS
- ✅ Нет ошибок линтера

## Тестирование

- ✅ Приложение запущено в dev режиме для проверки работоспособности
- ✅ Все функции работают корректно после миграции
- ✅ Нет ошибок при запуске приложения
- ✅ Мобильный сервер работает с ES-модулями
- ✅ Все импорты разрешаются корректно

## Дополнительные исправления после миграции

### Исправление ошибки EPIPE
В `main.js` добавлена обработка ошибки `EPIPE` (broken pipe) при логировании сообщений из renderer процесса:
```javascript
mainWindow.webContents.on('console-message', (event, level, message) => {
  try {
    console.log(`[renderer] ${message}`);
  } catch (error) {
    // Игнорируем EPIPE ошибки (broken pipe) при закрытии окна
    if (error.code !== 'EPIPE') {
      console.error('Ошибка при логировании:', error);
    }
  }
});
```

### Исправление импорта path в wait-for-vite.js
Исправлен дублирующий импорт `path`:
```javascript
// Было:
import path from 'path';
import { dirname } from 'path';

// Стало:
import path, { dirname } from 'path';
```

## Преимущества

1. ✅ Единый стандарт модулей во всем проекте
2. ✅ Упрощение shared кода (не нужно поддерживать оба формата)
3. ✅ Современный стандарт ES-модулей
4. ✅ Лучшая поддержка в будущем
5. ✅ Решена проблема с `matchMigration.js`
6. ✅ Упрощена работа с динамическими импортами
7. ✅ Лучшая поддержка статического анализа кода
