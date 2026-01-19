# Исправление ошибки "cannot find module SetService.ts" в production

## Проблема

При запуске собранного проекта возникает ошибка:
```
Uncaught Exception: cannot find module ... app.asar\SetService.ts ...
```

## Причина

В коде были импорты TypeScript файлов с явным указанием расширения `.ts`:
- `src/renderer/hooks/useMatch.js` - импортировал `SetService.ts`
- `src/main/server/api/MatchApiController.js` - импортировал `SetService.ts`, `ScoreService.ts`, `HistoryService.ts`
- `src/renderer/components/SetsDisplay.jsx` - импортировал `SetDomain.ts`
- `src/renderer/components/SetEditModal.jsx` - импортировал `SetDomain.ts`

В production сборке Electron не может выполнить TypeScript файлы напрямую без поддержки tsx.

## Решение

### 1. Убраны расширения `.ts` из импортов

Все импорты TypeScript файлов теперь без расширения:
- `import { SetService } from '../../shared/services/SetService';` (вместо `SetService.ts`)
- `import { SetDomain } from '../../shared/domain/SetDomain';` (вместо `SetDomain.ts`)

### 2. Перемещен `tsx` в production зависимости

`tsx` перемещен из `devDependencies` в `dependencies` в `package.json`, чтобы он был доступен в production сборке.

### 3. Создан entry point для регистрации tsx

Создан файл `src/main/main-entry.js`, который регистрирует tsx ДО импорта всех модулей:

```javascript
// Проверяем, загружен ли tsx через NODE_OPTIONS (dev режим)
const tsxAlreadyLoaded = process.env.NODE_OPTIONS && process.env.NODE_OPTIONS.includes('tsx');

// Регистрируем tsx только если он еще не загружен (production режим)
if (!tsxAlreadyLoaded) {
  const tsxApi = await import('tsx/esm/api');
  if (tsxApi && typeof tsxApi.register === 'function') {
    tsxApi.register();
  }
}

// Импортируем основной файл main.js после регистрации tsx
await import('./main.js');
```

### 4. Обновлен package.json

В `package.json` изменен `main` на `src/main/main-entry.js` для использования нового entry point.

### 5. Компиляция TypeScript в JavaScript перед сборкой

**ВАЖНО:** После попытки использовать tsx в production выяснилось, что `esbuild.exe` (используемый tsx) не может быть запущен из ASAR архива. Поэтому используется компиляция TypeScript в JavaScript перед сборкой.

Создан скрипт `scripts/compile-typescript.js` и конфигурация `tsconfig.build.json` для компиляции TypeScript файлов в JavaScript перед сборкой Electron приложения.

**Процесс сборки:**
1. Очистка папки `release` (если существует)
2. Компиляция TypeScript файлов в JavaScript (создает `.js` файлы рядом с `.ts` файлами)
3. Сборка React приложения через Vite
4. Упаковка в Electron приложение через electron-builder

**В production:** Используются скомпилированные `.js` файлы (tsx не нужен)  
**В dev режиме:** Используются `.ts` файлы через tsx (как и раньше)

### 6. Добавлены расширения `.js` в импорты

**КРИТИЧНО:** В ES модулях Node.js требует явного указания расширения `.js` в импортах, даже если исходный файл был `.ts`.

Все импорты TypeScript модулей теперь имеют расширение `.js`:
- `import { SetService } from '../../shared/services/SetService.js';`
- `import { SetDomain } from '../../shared/domain/SetDomain.js';`

Это необходимо для правильного разрешения модулей в production сборке.

## Проверка

После внесения изменений:

1. Установите зависимости: `npm install`
2. Пересоберите проект: `npm run build:electron`
3. Запустите собранное приложение и убедитесь, что ошибка исчезла

## Измененные файлы

- `src/renderer/hooks/useMatch.js` - добавлено расширение `.js` в импорт
- `src/main/server/api/MatchApiController.js` - добавлены расширения `.js` в импорты
- `src/renderer/components/SetsDisplay.jsx` - добавлено расширение `.js` в импорт
- `src/renderer/components/SetEditModal.jsx` - добавлено расширение `.js` в импорт
- `src/renderer/hooks/useMatch.ts` - добавлены расширения `.js` в импорты
- `src/main/server/api/MatchApiController.ts` - добавлены расширения `.js` в импорты
- Все TypeScript файлы в `src/shared/` - добавлены расширения `.js` в импорты
- `src/main/main-entry.js` - создан новый entry point (больше не использует tsx в production)
- `scripts/compile-typescript.js` - создан скрипт для компиляции TypeScript
- `tsconfig.build.json` - создана конфигурация для компиляции TypeScript
- `package.json` - `tsx` перемещен в `dependencies`, `main` изменен на `src/main/main-entry.js`, добавлена команда `compile:typescript`
