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
    - `POST /api/match/:sessionId/serve` - изменение подачи
    - `POST /api/match/:sessionId/undo` - отмена последнего действия
    - `GET /api/logos/check` - проверка доступности логотипов (для отладки)
  - Обслуживание статических файлов (логотипы через `/logos`)
    - **Dev режим:** `logos/` в корне проекта
    - **Production режим:** `userData/logos/` (тот же путь, что и `logoManager.getLogosDir()`)
  - CORS для мобильных устройств
  - Callback механизм для синхронизации изменений матча
  - **Выбор сетевого интерфейса:**
    - `getNetworkInterfaces()` - получение списка всех доступных сетевых интерфейсов
      - Возвращает массив объектов `{ ip, name, interfaceName, isPrivate, isWireless, isVpn }`
      - Фильтрует VPN интерфейсы
      - Сортирует по приоритету: частный IP + Wi-Fi, затем частный IP, затем публичный IP
    - `getLocalIP(selectedIP)` - получение IP адреса для сервера
      - Использует выбранный IP из настроек (`mobile.selectedIP`), если указан
      - Если выбранный IP недоступен, использует автоматическое определение по приоритету
      - Автоматически фильтрует VPN интерфейсы
  - Настройка сохранения выбранного сетевого интерфейса в `mobile.selectedIP`

#### `vmix-client.js` - VMixClient
- **Назначение:** Клиент для работы с vMix HTTP API
- **Технологии:** axios, xml2js
- **Основные методы:**
  - `testConnection()` - проверка подключения
  - `sendCommand(functionName, params)` - отправка произвольной команды в vMix
  - `updateInputField()` - обновление текстового поля через `SetText`
  - `setColor()` - изменение цвета через `SetColor`
  - `setTextVisibility()` - управление видимостью через `SetTextVisibleOn`/`Off`
  - `setImage()` - установка изображения через `SetImage`
  - `updateInputFields(inputName, fields, colorFields, visibilityFields, imageFields)` - массовое обновление полей разных типов
    - Отправляет отдельные HTTP запросы для каждого поля
    - Возвращает массив результатов для каждого поля
    - Используется для оптимизированной отправки только измененных полей
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
      "sessionId": null,
      "selectedIP": null
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
    - Настройки включают: `enabled`, `port`, `sessionId`, `selectedIP`
    - `selectedIP` - выбранный IP адрес сетевого интерфейса для мобильного сервера (null для автоматического определения)
  - `getAutoSaveSettings()` / `setAutoSaveSettings()` - работа с настройками автосохранения

#### `fileManager.js`
- **Назначение:** Управление файлами матчей
- **Основные функции:**
  - `createMatch()` - создание нового матча
  - `openMatch(filePath)` - открытие матча из файла
    - Проверяет наличие логотипов в исходном JSON **до** обработки
    - Если в открытом проекте нет логотипов, удаляет файлы `logo_a.png` и `logo_b.png` от предыдущего проекта
    - Это предотвращает использование старых файлов при открытии проекта без логотипов
  - `saveMatch()` - сохранение матча (автоматическое определение пути)
  - `saveMatchDialog()` - сохранение матча через диалог
  - `openMatchDialog()` - открытие матча через диалог
- **Формат файлов:** JSON в папке `matches/`

#### `logoManager.js`
- **Назначение:** Управление логотипами команд
- **Основные функции:**
  - `getLogosDir()` - получение пути к папке logos в зависимости от режима
    - **Dev режим:** `logos/` в корне проекта
    - **Production режим:** `userData/logos/` (доступно для записи, вместо read-only `extraResources`)
    - Использует `app.getPath('userData')` в production для корректной работы с правами доступа
  - `processTeamLogoForSave(team, teamLetter)` - сохранение логотипа в файл PNG
    - Проверяет `logo` и `logoBase64` для определения источника логотипа
    - Конвертация base64 в PNG файлы
    - Сохранение в фиксированные файлы `logo_a.png` и `logo_b.png` (перезапись)
    - Если логотипа нет, удаляет файл и возвращает команду с `undefined` для всех полей логотипов
    - Возвращает объект команды с `logoPath` и `logoBase64` (или `undefined`, если логотипа нет)
  - `processTeamLogoForLoad(team, teamLetter)` - загрузка логотипа из файла или base64
    - Приоритет 1: base64 из JSON (`logoBase64` - перезаписывает файл для синхронизации)
    - Приоритет 2: старый формат `logo` (если это base64)
    - Приоритет 3: загрузка из файла по `logoPath` или фиксированному имени (только если в JSON есть `logoPath`)
    - Если в JSON нет логотипов, возвращает команду с явно установленными `undefined` для всех полей логотипов
    - Это обеспечивает корректное отображение отсутствия логотипов в UI
  - `ensureLogosDir()` - создание папки logos и миграция из extraResources
    - Создает папку `userData/logos/` в production режиме
    - Выполняет миграцию логотипов из `extraResources/logos/` в `userData/logos/` при первом запуске
    - Вызывается автоматически при старте приложения и сохранении логотипов
  - `migrateLogosFromExtraResources()` - миграция логотипов из extraResources в userData
    - Копирует `logo_a.png` и `logo_b.png` из read-only `extraResources` в writable `userData`
    - Выполняется только один раз при первом запуске в production
    - Пропускается, если файлы уже существуют в userData
  - `cleanupLogosDirectory()` - очистка папки logos от устаревших файлов
    - Удаляет все файлы, кроме `logo_a.png`, `logo_b.png` и `.gitkeep`
    - Вызывается автоматически при старте приложения, сохранении матча, смене команд, установке матча для мобильного сервера
    - Безопасная обработка ошибок (не прерывает выполнение)
  - `saveLogoToFile(base64String, team)` - сохранение base64 в PNG файл
  - `loadLogoFromFile(logoPath)` - загрузка файла и конвертация в base64
  - `getLogoHttpUrl(logoPath, port)` - формирование HTTP URL для логотипа
- **Особенности:**
  - Фиксированные имена файлов для перезаписи (не создаются временные файлы)
  - В production логотипы хранятся в `userData/logos/` для обеспечения возможности записи
  - Автоматическая миграция из `extraResources` в `userData` при первом запуске
  - Поддержка смены логотипов при смене команд местами
  - Автоматическая очистка устаревших файлов для предотвращения накопления мусора

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

### Утилиты

#### `colorContrast.js`
- **Назначение:** Утилиты для работы с контрастностью цветов
- **Основные функции:**
  - `getRelativeLuminance(hex)` - вычисляет относительную яркость цвета по формуле WCAG 2.1
  - `getContrastTextColor(backgroundColor)` - определяет оптимальный цвет текста (черный или белый) для заданного фона
  - `getContrastTextColorSimple(backgroundColor)` - упрощенная версия для быстрого определения
  - `hexToRgb(hex)` - конвертирует hex цвет в RGB значения
  - `sRGBToLinear(value)` - конвертирует sRGB значение в линейное пространство
- **Использование:**
  - Автоматическое определение цвета текста на цветном фоне для обеспечения читаемости
  - Используется на страницах "Управление матчем" и "Управление составами" для адаптации цвета текста названий команд к цвету фона
  - Решает проблему нечитаемого текста при белой или черной форме игроков

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
  - `updateMatchData(match, forceUpdate)` - обновление данных матча в vMix (debounced, с поддержкой принудительного обновления)
  - `showOverlay(inputKey, buttonKey)` / `hideOverlay(inputKey)` - управление оверлеями
  - `isOverlayActive(inputKey, buttonKey)` - проверка активности оверлея с поддержкой отслеживания активной кнопки
  - `resetImageFieldsCache()` - сброс кэша логотипов для принудительного обновления
  - `updateCoachData()`, `updateReferee1Data()`, `updateReferee2ShowData()`, `updateReferee2Data()` - обновление данных для специальных плашек
  - Автоматическое обновление инпутов при изменении матча
  - **Оптимизация отправки команд:**
    - Кэширование последних отправленных значений для каждого инпута
    - Отправка только измененных полей (фильтрация по текстовым полям, цветам, видимости, изображениям)
    - Автоматический сброс кэша при смене матча, переподключении к vMix, изменении конфигурации
    - Параметр `forceUpdate` для исключительных случаев (создание/открытие матча, сохранение настроек)
  - **Отслеживание состояния оверлеев и активных кнопок:**
    - Периодический опрос состояния оверлеев из vMix API каждые 2 секунды (`OVERLAY_POLL_INTERVAL`)
    - Использование `activeButtonRef` (useRef) для отслеживания активной кнопки каждого инпута
    - Механизм определения внешней активации через маркер `'__EXTERNAL__'` для инпутов, активированных через vMix напрямую
    - Автоматическое определение активной кнопки при обнаружении внешней активации инпута
    - Защита от гонки условий при одновременной проверке нескольких кнопок через двойную проверку (double-check)
    - Точная проверка активности инпутов через сравнение номеров инпутов из `inputsMap`
  - Форматирование данных для vMix:
    - `formatCurrentScoreData()` - форматирование текущего счета
    - `formatLineupData(match, forceUpdate)` - форматирование заявки (с поддержкой timestamp для логотипов)
    - `formatRosterData(match, teamKey, forceUpdate)` - форматирование состава (с поддержкой timestamp для логотипов)

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
  - Вызывает `clearLogosOnNewMatch()` для удаления файлов `logo_a.png` и `logo_b.png`
  - Это обеспечивает, что при создании нового матча не остаются логотипы от предыдущего проекта
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

### Обновление матча → vMix (оптимизированное)

```
MatchControlPage (useMatch)
  ↓ изменение матча
useVMix (updateMatchData(match, forceUpdate))
  ↓
  ├─ Если forceUpdate = false (обычное изменение):
  │  ├─ formatCurrentScoreData() → сравнивается с кэшем → фильтруются измененные поля
  │  ├─ formatLineupData() → сравнивается с кэшем → фильтруются измененные поля
  │  ├─ formatRosterData() → сравнивается с кэшем → фильтруются измененные поля
  │  └─ Отправляются ТОЛЬКО измененные поля
  │
  └─ Если forceUpdate = true (принудительное обновление):
     ├─ Отправляются ВСЕ поля независимо от кэша
     ├─ Для логотипов добавляется timestamp к URL: logo_a.png?t=1234567890
     └─ Кэш обновляется после успешной отправки
  ↓ debounce (300ms)
window.electronAPI.updateInputFields
  ↓ IPC
main.js (vmix:update-input-fields handler)
  ↓
vmix-client.js (updateInputFields)
  ↓ HTTP GET (только для измененных полей или всех при forceUpdate)
vMix API
```

**Механизм оптимизации:**
- **Кэширование**: Хранятся последние отправленные значения для каждого инпута (currentScore, lineup, rosterTeamA, rosterTeamB)
- **Сравнение значений**: Новые значения сравниваются со старыми через функции `filterChangedFields()`, `filterChangedColorFields()`, `filterChangedVisibilityFields()`, `filterChangedImageFields()`
- **Фильтрация**: Отправляются только поля, значения которых изменились
- **Принудительное обновление**: При `forceUpdate=true` (создание/открытие матча, сохранение настроек/составов, смена команд, F5) отправляются все поля, **включая пустые**
- **Очистка данных в vMix**: При `forceUpdate=true` пустые поля отправляются как пустые строки `""` для очистки данных в vMix при открытии пустого проекта
- **Проверка hasFields**: При `forceUpdate=true` проверка `hasFields` не блокирует отправку, даже если все поля пустые
- **Сброс кэша**: Автоматически при смене матча (по `matchId`), переподключении к vMix, изменении конфигурации инпутов
- **Логотипы**: При `forceUpdate=true` добавляется timestamp к URL для гарантированного обновления: `logo_a.png?t=1234567890`

**Исключения (всегда используется forceUpdate=true):**
- Создание нового матча
- Открытие матча из файла
- Сохранение настроек матча
- Сохранение списков команд
- Смена команд местами
- Ручное обновление через F5 (меню "Вид" → "Обновить данные в vMix")

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
logoManager.js (processTeamLogoForSave) - сохранение логотипов в файлы
  ↓
logoManager.js (cleanupLogosDirectory) - очистка устаревших файлов
  ↓
File System (matches/*.json, logos/logo_a.png, logos/logo_b.png)
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
logoManager.js (processTeamLogoForSave) - сохранение логотипов
  ↓
logoManager.js (cleanupLogosDirectory) - очистка устаревших файлов
  ↓
File System (matches/*.json, logos/logo_a.png, logos/logo_b.png)
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
  ├─ cleanupLogosDirectory() - очистка устаревших файлов
  └─ Обновляем объекты команд
  ↓
Возврат обновленного матча
  ↓
MatchSettingsPage (обновление формы и UI)
  ↓
useVMix.resetImageFieldsCache() - сброс кэша логотипов
  ↓
useVMix.updateMatchData(swappedMatch, true) - принудительное обновление всех данных
  ↓
Форматирование данных с timestamp для логотипов: logo_a.png?t=1234567890
  ↓
Отправка всех полей в vMix (включая обновленные логотипы)
```

## Хранение данных

### Матчи
- **Формат:** JSON файлы
- **Расположение:** `matches/` (создается автоматически)
- **Структура:** См. `src/shared/types/Match.ts`
- **Структура команды (Team):**
  - `name: string` - название команды
  - `color: string` - цвет формы игроков (hex формат, например `#3498db`)
  - `liberoColor?: string` - цвет формы либеро (hex формат, опционально)
  - `logo?: string` - логотип команды (base64 или путь к файлу)
  - `logoPath?: string` - путь к файлу логотипа
  - `logoBase64?: string` - base64 данные логотипа
  - `coach?: string` - тренер команды
  - `roster?: Player[]` - состав команды
  - `startingLineupOrder?: number[]` - порядок игроков в стартовом составе

### Настройки
- **Формат:** JSON файл
- **Расположение:** `settings.json` (в корне проекта, не в git)
- **Структура:** См. `settingsManager.js`

### Логотипы
- **Формат:** PNG файлы
- **Расположение:**
  - **Dev режим:** `logos/` в корне проекта
  - **Production режим:** `userData/logos/` (например, `%APPDATA%/VolleyScore Master/logos/` на Windows)
  - **Причина:** В production `extraResources` доступна только для чтения, поэтому логотипы хранятся в `userData` для возможности записи
- **Имена:** `logo_a.png`, `logo_b.png` (фиксированные имена, перезаписываются при каждом сохранении)
- **Миграция:** При первом запуске в production логотипы автоматически копируются из `extraResources/logos/` в `userData/logos/`
- **Доступ:** Через HTTP сервер по URL `http://[выбранный_IP]:[порт]/logos/logo_a.png`
- **Передача в vMix:** URL логотипов формируется с учетом выбранного сетевого интерфейса мобильного сервера
- **Хранение в JSON:** Логотипы сохраняются в формате `{ logoPath: "logos/logo_a.png", logoBase64: "data:image/png;base64,..." }`
  - `logoPath` - относительный путь для HTTP доступа
  - `logoBase64` - base64 данные для портативности и восстановления файла

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
