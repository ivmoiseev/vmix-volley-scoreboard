# План миграции main process на ES-модули

## Обзор

Перевод main process с CommonJS на ES-модули для унификации стандарта модулей во всем проекте.

## Преимущества

1. **Единый стандарт** - один формат модулей во всем проекте
2. **Упрощение shared кода** - не нужно поддерживать оба формата
3. **Современный стандарт** - ES-модули - это будущее JavaScript
4. **Лучшая поддержка** - большинство новых библиотек используют ES-модули
5. **Статический анализ** - лучшая поддержка tree-shaking и оптимизации

## Требования

- Node.js 12+ (Electron использует современную версию Node.js)
- Все зависимости должны поддерживать ES-модули (или иметь ESM версии)

## Шаги миграции

### Шаг 1: Изменение package.json

```json
{
  "type": "module"  // Изменить с "commonjs" на "module"
}
```

**ВАЖНО:** Это изменит интерпретацию ВСЕХ .js файлов в проекте как ES-модулей.

### Шаг 2: Обновление main process файлов

Нужно переписать все файлы в `src/main/`:

1. **main.js** - точка входа
2. **fileManager.js**
3. **logoManager.js**
4. **server.js**
5. **settingsManager.js**
6. **vmix-client.js**
7. **vmix-config.js**
8. **vmix-field-migration.js**
9. **vmix-input-configs.js**
10. **preload.js** - может остаться CommonJS (специфика Electron)
11. **utils/domUtils.js**

### Шаг 3: Обновление shared файлов

Файлы в `src/shared/` уже поддерживают оба формата, но можно оставить только ES-модули:

1. **errorHandler.js** - переписать на ES-модули
2. **matchUtils.js** - переписать на ES-модули
3. **volleyballRules.js** - убрать CommonJS экспорт
4. **vmix-field-utils.js** - убрать CommonJS экспорт
5. **matchMigration.js** - убрать CommonJS экспорт

### Шаг 4: Особенности Electron

**preload.js** - может остаться CommonJS, так как Electron требует CommonJS для preload скриптов.

Если нужно использовать ES-модули в preload, можно:
- Использовать `.mjs` расширение
- Или оставить CommonJS (рекомендуется)

## Примеры преобразования

### CommonJS → ES-модули

**До:**
```javascript
const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

function myFunction() {
  // ...
}

module.exports = {
  myFunction
};
```

**После:**
```javascript
import fs from 'fs/promises';
import path from 'path';
import { app } from 'electron';

export function myFunction() {
  // ...
}
```

### Именованный экспорт

**До:**
```javascript
module.exports = {
  functionA,
  functionB,
  CONSTANT: 'value'
};
```

**После:**
```javascript
export {
  functionA,
  functionB,
  CONSTANT: 'value'
};
```

### Динамический импорт

**До:**
```javascript
const module = require('./module');
```

**После:**
```javascript
import module from './module.js'; // Обязательно .js расширение
```

**ВАЖНО:** В ES-модулях нужно указывать расширение `.js` для относительных импортов.

## Потенциальные проблемы

### 1. __dirname и __filename

В ES-модулях нет `__dirname` и `__filename`. Нужно использовать:

```javascript
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

### 2. require.cache

В ES-модулях нет `require.cache`. Если используется кэширование модулей, нужно переписать логику.

### 3. require.resolve

Нужно использовать `import.meta.resolve()` (экспериментально) или `createRequire()`:

```javascript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const path = require.resolve('./module');
```

### 4. Зависимости без ES-модулей

Если какая-то зависимость не поддерживает ES-модули, можно использовать `createRequire()`:

```javascript
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const oldModule = require('old-commonjs-module');
```

## Порядок выполнения

1. ✅ Создать резервную копию проекта
2. ✅ Изменить `package.json` - добавить `"type": "module"`
3. ✅ Обновить `src/main/main.js` (точка входа)
4. ✅ Обновить все файлы в `src/main/` по одному
5. ✅ Обновить `src/shared/` файлы (убрать CommonJS экспорты)
6. ✅ Обновить `matchMigration.js` - убрать CommonJS экспорт
7. ✅ Протестировать запуск приложения
8. ✅ Исправить ошибки импорта (расширения .js)
9. ✅ Протестировать все функции
10. ✅ Исправить ошибку EPIPE в main.js
11. ✅ Исправить дублирующий импорт path в wait-for-vite.js
12. ✅ Мигрировать scripts/analyze-test-results.js

## Статус: ✅ ЗАВЕРШЕНО

Все этапы миграции выполнены. Приложение полностью работает на ES-модулях.

См. подробности в `es-modules-migration-completed.md`.

## Проверка совместимости

Перед миграцией проверить:

1. Все зависимости поддерживают ES-модули
2. Electron версия поддерживает ES-модули в main process
3. Нет использования `require.cache` или других CommonJS-специфичных функций

## Откат

Если что-то пойдет не так, можно откатить:

1. Вернуть `"type": "commonjs"` в package.json
2. Вернуть все require/export обратно
3. Или использовать git для отката изменений

## Альтернативный подход

Если полная миграция слишком рискованна, можно:

1. Использовать `.mjs` расширение для новых файлов
2. Постепенно мигрировать файлы
3. Оставить старые файлы в CommonJS

Но это создаст смешанную структуру, что не идеально.

## Рекомендация

**Рекомендуется выполнить полную миграцию**, так как:
- Проект не очень большой
- Все зависимости современные
- Electron поддерживает ES-модули
- Это упростит поддержку в будущем
