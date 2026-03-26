# Документация по разработке

Эта папка содержит документацию, связанную с разработкой, рефакторингом и улучшением кода проекта.

## 📖 Документы

### Планирование и аудит
- **[Дизайн и темы](DESIGN.md)** - актуальное описание системы дизайна (токены, светлая/тёмная тема, компоненты, оформление страниц)
- **[QA Аудит](QA_AUDIT_REPORT.md)** - ⚠️ **ВАЖНО**: отчет о качестве кода, найденных проблемах и рекомендациях по улучшению
- **[Аудит безопасности](SECURITY_AUDIT_REPORT.md)** - полный аудит безопасности: уязвимости, легаси, неиспользуемый код, план решения
- **[Инструкции по рефакторингу безопасности](security-refactoring-implementation-guide.md)** - поэтапные инструкции для программистов (TDD)
- **[Инструкция: замена alert/confirm на IPC-диалоги](electron-dialog-refactoring-implementation-guide.md)** - исправление бага с фокусом в полях ввода в Electron (TDD, этапность, тесты); **этапы выполнены** (2026-02-12), раздел 10 — исправление ошибок компиляции TS
- **[Аудит UI/UX](ui-ux-audit-report.md)** - анализ пользовательского интерфейса и рекомендации по улучшению дизайна (разрешение 1366×768); статус реализации см. в DESIGN.md
- **[Инструкции по рефакторингу дизайна](design-refactoring-implementation-guide.md)** - пошаговый рефакторинг (этапы выполнены); текущее состояние — в DESIGN.md
- **[Руководство по рефакторингу](REFACTORING_GUIDE.md)** - подробный план рефакторинга и улучшения кода

### Миграции и улучшения
- **[План миграции на TypeScript](typescript-migration-plan.md)** - ✅ завершён: весь src и тесты на TypeScript (.ts/.tsx), чек-лист выполнен
- **[Shared: один источник истины (TS)](shared-js-ts-duplication.md)** - состояние после устранения дубликатов JS/TS в shared
- **[Руководство по миграции на Vitest](vitest-migration-guide.md)** - пошаговая инструкция по миграции с Jest на Vitest
- **[Очистка структуры проекта](project-structure-cleanup.md)** - описание удаления Jest, дублирующихся папок и упрощения структуры сборки

### Реализованные функции
- **[Улучшения составов](roster-inputs-split-and-improvements.md)** - описание улучшений системы управления составами команд
- **[Состояния партий и тайминг - Руководство](set-status-and-timing-implementation-guide.md)** - руководство по реализации функционала управления состояниями партий
- **[Инпуты "Счет после X партии"](set-score-inputs-implementation-guide.md)** - руководство по реализации функционала инпутов "Счет после X партии" (set1Score - set5Score)
- **[Рефакторинг: Управление счетом и состояниями партий - Руководство](score-and-set-status-refactoring-implementation-guide.md)** - руководство по реализации рефакторинга с пошаговыми инструкциями

### Данные и интеграция vMix
- **[Текущий функционал: интеграция с vMix и настройка инпутов](vmix-current-functionality.md)** — единое описание подключения, настроек инпутов/полей, отправки данных, оверлеев и remap
- **[Карта данных для vMix](vmix-data-map.md)** — полная карта данных приложения для отправки в vMix (источники, поля, типы)
- **[Плашки vMix при нескольких конфигурациях на один инпут](vmix-overlay-same-input-refactoring.md)** — описание сделанных изменений (идентификация активной плашки, обновление данных перед показом)
- **[UX-рефакторинг сопоставления полей vMix ↔ данные приложения](vmix-field-mapping-ux-refactoring-plan.md)** — план улучшений UX: поиск/группировка, быстрый выбор, массовые операции, обозреватель сопоставлений
- **[Инструкция: UX-рефакторинг сопоставления полей vMix ↔ данные приложения](vmix-field-mapping-ux-refactoring-implementation-guide.md)** — пошаговые этапы для программиста (поиск, пикеры, mass-mapping для Rosters/Lineup, copy/paste, обозреватель)

### Планы и руководства по новому функционалу
- **[План: HTML-страницы оверлеев для vMix/OBS (Browser Source)](overlay-pages-browser-source-plan.md)** — план внедрения страниц scoreboard, intro, rosters (1920×1080, прозрачный фон) через мобильный сервер
- **[Автоматические плашки событий vMix (сетбол, матчбол, таймаут)](vmix-event-overlays.md)** — анализ, план реализации (этапы 0–7), доработки по багам, ревью и описание проделанного рефакторинга

### Документация логики
- **[Логика управления счетом и состояниями партий](score-and-set-status-logic-documentation.md)** - подробная документация всей логики управления счетом, начисления счета, смены состояний партий
- **[Варианты волейбола: зал, пляж, снежный](volleyball-variants.md)** - правила счёта и архитектура реализации зального, пляжного и снежного волейбола (Россия)
- **[Анализ многопроцессной архитектуры](multi-process-architecture-analysis.md)** - анализ целесообразности вынесения компонентов в отдельные процессы
- **[Диаграммы архитектуры](architecture-diagrams.md)** - диаграммы для визуализации архитектуры системы

### Требования и совместимость
- **[Требования к версиям зависимостей](dependencies-version-requirements.md)** - ⚠️ **КРИТИЧЕСКИ ВАЖНО**: требования к версиям библиотек для корректной работы проекта

### Настройка и конфигурация
- **[Настройка автоматических обновлений](auto-updates-setup.md)** - руководство по настройке и использованию системы автоматических обновлений через GitHub Releases

## 🎯 Структура

```
development/
├── README.md                              # Этот файл
├── DESIGN.md                              # Дизайн и темы (токены, темы, компоненты) — актуальное состояние
├── QA_AUDIT_REPORT.md                     # QA аудит кода
├── SECURITY_AUDIT_REPORT.md               # Аудит безопасности
├── ui-ux-audit-report.md                  # Аудит UI/UX и рекомендации по дизайну
├── design-refactoring-implementation-guide.md # Инструкции по рефакторингу дизайна (этапы выполнены)
├── REFACTORING_GUIDE.md                   # Руководство по рефакторингу
├── electron-dialog-refactoring-implementation-guide.md # Замена alert/confirm на IPC-диалоги (баг фокуса)
├── dependencies-version-requirements.md   # Требования к версиям зависимостей
├── project-structure-cleanup.md          # Очистка структуры проекта
├── vitest-migration-guide.md             # Руководство по миграции на Vitest
├── roster-inputs-split-and-improvements.md # Улучшения составов
├── set-status-and-timing-implementation-guide.md # Руководство по реализации состояний партий
├── set-score-inputs-implementation-guide.md # Руководство по реализации инпутов "Счет после X партии"
├── score-and-set-status-logic-documentation.md # Документация логики управления счетом и партиями
├── volleyball-variants.md                     # Правила и архитектура вариантов волейбола (зал/пляж/снежный)
├── score-and-set-status-refactoring-implementation-guide.md # Руководство по реализации рефакторинга
├── vmix-current-functionality.md          # Текущий функционал: интеграция с vMix и настройка инпутов
├── vmix-data-map.md                      # Карта данных приложения для vMix
├── vmix-field-mapping-ux-refactoring-plan.md # UX-рефакторинг сопоставления полей vMix ↔ данные приложения
├── overlay-pages-browser-source-plan.md   # План: HTML-страницы оверлеев для vMix/OBS (Browser Source)
├── vmix-event-overlays.md                            # Автоматические плашки событий vMix (анализ, план, рефакторинг)
├── multi-process-architecture-analysis.md # Анализ многопроцессной архитектуры
├── architecture-diagrams.md               # Диаграммы архитектуры
└── auto-updates-setup.md                 # Настройка автоматических обновлений
```

### Тесты рефакторинга инпутов vMix (2026-02-04)

Добавлены юнит-тесты для функционала рефакторинга инпутов vMix (этапы 5–8 инструкции):

- **Shared:** `tests/unit/shared/getValueByDataMapKey.test.ts` — извлечение значений по ключам dataMapCatalog
- **Main:** `src/main/vmix-overlay-utils.ts` (вынесено из main.ts), `tests/unit/main/vmix-overlay-utils.test.ts` — URL логотипов, поиск конфига инпута
- **Renderer:** `tests/unit/renderer/VMixOverlayButtons.test.tsx`, `VMixInputFieldsPanel.test.tsx`, `useVMix-dynamic-inputs.test.ts`, `VMixSettingsPage.test.tsx`
- **MobileAccessPage:** исправлены тесты (getByRole для кнопок, `running: true` в моках, синхронизация с `window.electronAPI`)

## 📚 Связанная документация

- [Главная документация](../README.md)
- [Архитектура проекта](../architecture/ARCHITECTURE.md)
- [Тестирование](../testing/README.md)
