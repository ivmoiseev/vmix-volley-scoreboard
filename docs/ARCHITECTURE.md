# Архитектура приложения vMix Volley Scoreboard

## Общая архитектура

Приложение построено на базе **Electron** и использует архитектуру с разделением на Main Process и Renderer Process.

```
┌─────────────────────────────────────────────────────────┐
│                   Electron Application                  │
├──────────────────────────┬──────────────────────────────┤
│   Main Process           │   Renderer Process           │
│   (Node.js)              │   (React + Vite)             │
│                          │                              │
│  - main.js               │  - App.jsx                   │
│  - server.js             │  - pages/                    │
│  - vmix-client.js        │  - components/               │
│  - settingsManager.js    │  - hooks/                    │
│  - fileManager.js        │  - utils/                    │
│  - logoManager.js        │                              │
│  - preload.js            │                              │
└──────────────────────────┴──────────────────────────────┘
```

## Структура проекта

```
vmix-volley-scoreboard/
├── src/
│   ├── main/                    # Main Process (Node.js)
│   │   ├── main.js              # Точка входа, управление окнами, IPC handlers
│   │   ├── server.js            # HTTP сервер для мобильного доступа
│   │   ├── vmix-client.js       # Клиент для работы с vMix API
│   │   ├── vmix-config.js       # Конфигурация vMix (обертка над settingsManager)
│   │   ├── vmix-input-configs.js # Конфигурации полей по умолчанию
│   │   ├── settingsManager.js   # Менеджер глобальных настроек
│   │   ├── fileManager.js       # Управление файлами матчей
│   │   ├── logoManager.js       # Управление логотипами команд
│   │   └── preload.js           # Preload скрипт для безопасного IPC
│   │
│   ├── renderer/                 # Renderer Process (React)
│   │   ├── index.html            # HTML шаблон
│   │   ├── index.jsx             # Точка входа React
│   │   ├── App.jsx               # Главный компонент с маршрутизацией
│   │   ├── pages/                # Страницы приложения
│   │   │   ├── WelcomePage.jsx
│   │   │   ├── MatchControlPage.jsx
│   │   │   ├── MatchSettingsPage.jsx
│   │   │   ├── RosterManagementPage.jsx
│   │   │   ├── VMixSettingsPage.jsx
│   │   │   ├── MobileAccessPage.jsx
│   │   │   └── AboutPage.jsx
│   │   ├── components/           # Переиспользуемые компоненты
│   │   │   ├── Layout.jsx
│   │   │   ├── ScoreDisplay.jsx
│   │   │   ├── SetsDisplay.jsx
│   │   │   ├── ScoreButtons.jsx
│   │   │   ├── ServeControl.jsx
│   │   │   ├── StatusIndicators.jsx
│   │   │   ├── VMixOverlayButtons.jsx
│   │   │   └── ErrorBoundary.jsx
│   │   ├── hooks/                # React хуки
│   │   │   ├── useMatch.js       # Логика управления матчем
│   │   │   └── useVMix.js        # Интеграция с vMix
│   │   └── utils/                # Утилиты
│   │       ├── debounce.js
│   │       └── imageResize.js
│   │
│   └── shared/                   # Общий код
│       ├── types/
│       │   └── Match.ts          # TypeScript типы для матча
│       ├── matchUtils.js          # Утилиты для работы с матчами
│       ├── volleyballRules.js    # Правила волейбола
│       └── errorHandler.js        # Обработка ошибок
│
├── docs/                         # Документация
├── matches/                      # Сохраненные матчи (JSON файлы)
├── logos/                        # Логотипы команд (logo_a.png, logo_b.png)
├── settings.json                 # Глобальные настройки (не в git)
├── package.json
├── vite.config.js
└── tsconfig.json
```

## Main Process

### Основные модули

#### `main.js`
- **Назначение:** Точка входа приложения, управление окнами, IPC handlers
- **Основные функции:**
  - Создание и управление главным окном Electron
  - Обработка IPC запросов от renderer процесса
  - Управление меню приложения
  - Обработка закрытия приложения с проверкой несохраненных изменений
  - Автоматическое восстановление мобильного сервера при запуске
  - Отслеживание пути к файлу текущего матча (`currentMatchFilePath`)
  - Функция `scheduleAutoSave()` для автосохранения с debounce
  - Функция `match:swap-teams` для смены команд местами

#### `server.js` - MobileServer
- **Назначение:** HTTP сервер для мобильного доступа
- **Технологии:** Express
- **Основные функции:**
  - Запуск/остановка HTTP сервера
  - Управление сессиями доступа (UUID)
  - API endpoints для мобильного интерфейса:
    - `GET /panel/:sessionId` - HTML страница мобильной панели
    - `GET /api/match/:sessionId` - получение данных матча
    - `POST /api/match/:sessionId/score` - обновление счета
    - `POST /api/match/:sessionId/set` - завершение партии
  - Обслуживание статических файлов (логотипы через `/logos`)
  - CORS для мобильных устройств
  - Callback механизм для синхронизации изменений матча

#### `vmix-client.js` - VMixClient
- **Назначение:** Клиент для работы с vMix HTTP API
- **Технологии:** axios, xml2js
- **Основные методы:**
  - `testConnection()` - проверка подключения
  - `updateInputField()` - обновление текстового поля через `SetText`
  - `setColor()` - изменение цвета через `SetColor`
  - `setTextVisibility()` - управление видимостью через `SetTextVisibleOn`/`Off`
  - `setImage()` - установка изображения через `SetImage`
  - `updateInputFields()` - массовое обновление полей разных типов
  - `showOverlay()` / `hideOverlay()` - управление оверлеями
  - `getOverlayState()` - получение состояния оверлеев из XML
  - `getInputs()` - получение списка инпутов
  - `findInputNumberByIdentifier()` - разрешение имен инпутов в номера

#### `settingsManager.js`
- **Назначение:** Менеджер глобальных настроек приложения
- **Файл:** `settings.json` в корне проекта
- **Структура настроек:**
  ```json
  {
    "vmix": {
      "host": "localhost",
      "port": 8088,
      "inputs": {
        "currentScore": {
          "enabled": true,
          "inputIdentifier": "Input5",
          "overlay": 1,
          "fields": { ... }
        }
      }
    },
    "mobile": {
      "enabled": false,
      "port": 3000,
      "sessionId": null
    },
    "autoSave": {
      "enabled": true
    }
  }
  ```
- **Основные функции:**
  - `loadSettings()` - загрузка настроек с автоматической миграцией
  - `saveSettings()` - сохранение настроек
  - `getVMixSettings()` / `setVMixSettings()` - работа с настройками vMix
  - `getMobileSettings()` / `setMobileSettings()` - работа с настройками мобильного сервера
  - `getAutoSaveSettings()` / `setAutoSaveSettings()` - работа с настройками автосохранения

#### `fileManager.js`
- **Назначение:** Управление файлами матчей
- **Основные функции:**
  - `createMatch()` - создание нового матча
  - `openMatch()` - открытие матча из файла
  - `saveMatch()` - сохранение матча (автоматическое определение пути)
  - `saveMatchDialog()` - сохранение матча через диалог
  - `openMatchDialog()` - открытие матча через диалог
- **Формат файлов:** JSON в папке `matches/`

#### `logoManager.js`
- **Назначение:** Управление логотипами команд
- **Основные функции:**
  - `processTeamLogoForSave()` - сохранение логотипа в файл PNG
  - Конвертация base64 в PNG файлы
  - Сохранение в `logos/logo_a.png` и `logos/logo_b.png`
  - Поддержка смены логотипов при смене команд местами

#### `vmix-input-configs.js`
- **Назначение:** Конфигурации полей по умолчанию для инпутов vMix
- **Основные функции:**
  - `getDefaultFieldsForInput()` - получение полей по умолчанию для инпута
  - `migrateInputToNewFormat()` - миграция старых настроек в новый формат

#### `preload.js`
- **Назначение:** Preload скрипт для безопасного IPC
- **Функциональность:**
  - Предоставляет `window.electronAPI` для renderer процесса
  - Безопасная обертка над IPC вызовами
  - Context isolation для безопасности

## Renderer Process

### Структура React приложения

#### Маршрутизация (`App.jsx`)
- Использует React Router DOM v7
- Маршруты:
  - `/` - WelcomePage
  - `/match` - MatchControlPage
  - `/match/settings` - MatchSettingsPage
  - `/match/roster` - RosterManagementPage
  - `/vmix/settings` - VMixSettingsPage
  - `/mobile/access` - MobileAccessPage
  - `/about` - AboutPage

#### React Hooks

##### `useMatch.js`
- **Назначение:** Логика управления матчем
- **Основные функции:**
  - `changeScore()` - изменение счета
  - `changeServingTeam()` - изменение подачи
  - `finishSet()` - завершение партии
  - `changeStatistics()` - изменение статистики
  - `toggleStatistics()` - включение/выключение статистики
  - `undoLastAction()` - отмена последнего действия
  - `isSetballNow()` / `setballTeam()` - определение сетбола
  - `isMatchballNow()` / `matchballTeam()` - определение матчбола
  - `canFinish()` - проверка возможности завершения партии
- **Автосохранение:**
  - Автоматическое сохранение при изменениях матча через `match:set-current`
  - Debounce механизм (2 секунды) для оптимизации частоты сохранений
  - Работает только если файл уже был сохранен ранее

##### `useVMix.js`
- **Назначение:** Интеграция с vMix
- **Основные функции:**
  - `updateMatchData()` - обновление данных матча в vMix (debounced)
  - `showOverlay()` / `hideOverlay()` - управление оверлеями
  - `isOverlayActive()` - проверка активности оверлея
  - Автоматическое обновление инпутов при изменении матча
  - Форматирование данных для vMix:
    - `formatCurrentScoreData()` - форматирование текущего счета
    - `formatLineupData()` - форматирование заявки
    - `formatRosterData()` - форматирование состава
  - Периодический опрос состояния оверлеев из vMix

### Компоненты

#### `Layout.jsx`
- Общий layout для всех страниц
- Навигация между страницами

#### `ScoreDisplay.jsx`
- Отображение текущего счета матча

#### `SetsDisplay.jsx`
- Отображение счета по партиям

#### `ScoreButtons.jsx`
- Кнопки управления счетом (+1, -1 для каждой команды)

#### `ServeControl.jsx`
- Управление подачей (отображение и ручная коррекция)

#### `StatusIndicators.jsx`
- Индикаторы сетбола и матчбола

#### `VMixOverlayButtons.jsx`
- Кнопки управления оверлеями vMix
- State-dependent кнопки с синхронизацией состояния

## Коммуникация между процессами

### IPC (Inter-Process Communication)

**Main Process → Renderer Process:**
- `navigate` - навигация на страницу
- `load-match` - загрузка матча
- `refresh-vmix` - обновление vMix
- `match-saved` - уведомление о сохранении матча

**Renderer Process → Main Process (через `window.electronAPI`):**
- `match:create` - создание матча
- `match:open-dialog` - открытие матча
- `match:save` - сохранение матча (первый раз - диалог, повторно - в тот же файл)
- `match:save-dialog` - сохранение матча как...
- `match:set-current` - установка текущего матча
- `match:swap-teams` - смена команд местами
- `autosave:get-settings` - получение настроек автосохранения
- `autosave:set-settings` - установка настроек автосохранения
- `vmix:get-config` - получение настроек vMix
- `vmix:set-config` - сохранение настроек vMix
- `vmix:test-connection` - тест подключения к vMix
- `vmix:update-input-fields` - обновление полей инпута
- `vmix:show-overlay` / `vmix:hide-overlay` - управление оверлеями
- `vmix:get-overlay-state` - получение состояния оверлеев
- `mobile:start-server` / `mobile:stop-server` - управление мобильным сервером
- `mobile:get-server-info` - получение информации о сервере
- `mobile:generate-session` - генерация сессии
- `mobile:get-saved-session` - получение сохраненной сессии
- `mobile:set-match` - установка матча для мобильного сервера
- `onAutoSaveSettingsChanged` - событие изменения настроек автосохранения

## Потоки данных

### Обновление матча → vMix

```
MatchControlPage (useMatch)
  ↓ изменение матча
useVMix (updateMatchData)
  ↓ debounce (300ms)
window.electronAPI.updateInputFields
  ↓ IPC
main.js (vmix:update-input-fields handler)
  ↓
vmix-client.js (updateInputFields)
  ↓ HTTP GET
vMix API
```

### Мобильный доступ → Main Process

```
Mobile Device (Browser)
  ↓ HTTP POST /api/match/:sessionId/score
server.js (MobileServer)
  ↓ callback
main.js (onMatchUpdate callback)
  ↓ IPC send
Renderer Process (load-match event)
  ↓
MatchControlPage (обновление матча)
```

### Сохранение матча

```
MatchControlPage
  ↓ Ctrl+S или кнопка
window.electronAPI.saveMatch
  ↓ IPC
main.js (match:save handler)
  ↓ проверка currentMatchFilePath
  ├─ Если файл существует → fileManager.saveMatch(match, filePath)
  └─ Если файла нет → fileManager.saveMatchDialog(match)
  ↓
fileManager.js (saveMatch)
  ↓
logoManager.js (processTeamLogoForSave)
  ↓
File System (matches/*.json, logos/*.png)
```

### Автосохранение матча

```
MatchControlPage (useMatch)
  ↓ изменение матча
match:set-current (IPC)
  ↓
main.js (scheduleAutoSave)
  ↓ проверка автосохранения и currentMatchFilePath
  ↓ debounce (2 секунды)
  ↓
fileManager.saveMatch(match, currentMatchFilePath)
  ↓
File System (matches/*.json, logos/*.png)
```

### Смена команд местами

```
MatchSettingsPage
  ↓ кнопка "Поменять команды местами"
window.electronAPI.swapTeams(match)
  ↓ IPC
main.js (match:swap-teams handler)
  ↓
  ├─ Меняем команды местами (teamA ↔ teamB)
  ├─ Меняем счет (scoreA ↔ scoreB)
  ├─ Инвертируем подачу (A ↔ B)
  ├─ Меняем счет в партиях
  ├─ Меняем статистику
  ├─ Сохраняем логотипы в правильные файлы (logo_a.png, logo_b.png)
  └─ Обновляем объекты команд
  ↓
Возврат обновленного матча
  ↓
MatchSettingsPage (обновление формы и UI)
```

## Хранение данных

### Матчи
- **Формат:** JSON файлы
- **Расположение:** `matches/` (создается автоматически)
- **Структура:** См. `src/shared/types/Match.ts`

### Настройки
- **Формат:** JSON файл
- **Расположение:** `settings.json` (в корне проекта, не в git)
- **Структура:** См. `settingsManager.js`

### Логотипы
- **Формат:** PNG файлы
- **Расположение:** `logos/`
- **Имена:** `logo_a.png`, `logo_b.png` (фиксированные имена)
- **Доступ:** Через HTTP сервер по URL `http://[IP]:[порт]/logos/logo_a.png`

## Безопасность

### Context Isolation
- Renderer процесс изолирован от Node.js API
- Доступ к Node.js только через IPC через `preload.js`

### Мобильный доступ
- Уникальные сессии (UUID)
- Валидация сессий при каждом запросе
- Доступ только в локальной сети

## Технологии и зависимости

### Основные зависимости
- **electron** (^39.2.7) - фреймворк
- **react** (^19.2.3) - UI библиотека
- **react-dom** (^19.2.3) - рендеринг React
- **react-router-dom** (^7.11.0) - маршрутизация
- **vite** (^7.3.0) - сборщик и dev-сервер
- **express** (^5.2.1) - HTTP сервер
- **axios** (^1.13.2) - HTTP клиент
- **xml2js** (^0.6.2) - парсинг XML
- **qrcode** (^1.5.4) - генерация QR-кодов
- **uuid** (^13.0.0) - генерация UUID
- **electron-store** (^11.0.2) - хранение настроек (используется через кастомный менеджер)

### Dev зависимости
- **@vitejs/plugin-react** (^5.1.2) - плагин React для Vite
- **typescript** (^5.9.3) - TypeScript (для типов)
- **electron-builder** (^26.0.12) - сборка Electron приложения
- **concurrently** (^9.2.1) - параллельный запуск команд
- **wait-on** (^9.0.3) - ожидание готовности сервера

## Сборка и разработка

### Режим разработки
```bash
npm run dev
```
- Запускает Vite dev server (порт 5173 или следующий свободный)
- Запускает Electron приложение
- Автоматически находит правильный порт Vite

### Сборка
```bash
npm run build        # Сборка React приложения
npm run build:electron # Сборка Electron приложения
```

### Структура сборки
- React приложение собирается в `dist/`
- Electron использует `dist/` для production сборки

## Расширяемость

### Добавление нового инпута vMix
1. Добавить конфигурацию полей в `vmix-input-configs.js`
2. Добавить ключ инпута в `settingsManager.js` (getDefaultSettings)
3. Добавить label в `VMixSettingsPage.jsx` (inputLabels)
4. Добавить форматирование данных в `useVMix.js` (если нужно)

### Добавление новой страницы
1. Создать компонент в `src/renderer/pages/`
2. Добавить маршрут в `App.jsx`
3. Добавить пункт меню в `main.js` (если нужно)

### Добавление нового типа поля
1. Добавить тип в `vmix-input-configs.js`
2. Добавить обработку в `vmix-client.js` (новый метод или расширение существующего)
3. Добавить форматирование в `useVMix.js`
4. Обновить UI в `VMixSettingsPage.jsx` (визуальный индикатор типа)
