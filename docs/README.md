# Документация VolleyScore Master

Добро пожаловать в документацию проекта VolleyScore Master! Этот документ поможет вам найти нужную информацию.

## 📚 Навигация по документации

### 🚀 Начало работы
- **[Описание приложения](getting-started/app-description.md)** - общее описание приложения и его функций
- **[Структура UI](getting-started/ui-structure.md)** - описание интерфейса и страниц приложения
- **[Дизайн и темы](development/DESIGN.md)** - текущая система дизайна (токены, светлая/тёмная тема, компоненты)

### 🏗️ Архитектура
- **[Архитектура проекта](architecture/ARCHITECTURE.md)** - подробное описание архитектуры, структуры кода и потоков данных
- **[План редизайна настроек vMix](architecture/vmix-settings-redesign-plan.md)** - описание реализованной системы настроек vMix

### 🔌 API и интеграции
- **[Справочник vMix API](api/vmix-api-reference.md)** - документация по HTTP API vMix
- **[Пример ответа vMix](api/vMix%20Responce%20Example.xml)** - пример XML ответа от vMix API

### 🧪 Тестирование
- **[Руководство по тестированию](testing/TESTING.md)** - основное руководство по тестированию
- **[Быстрый старт](testing/TESTING_QUICK_START.md)** - быстрое начало работы с тестами
- **[Настройка тестирования](testing/TESTING_SETUP_GUIDE.md)** - подробная инструкция по настройке окружения

### 💻 Разработка
- **[Дизайн и темы](development/DESIGN.md)** - актуальное описание системы дизайна (токены, темы, компоненты)
- **[QA аудит](development/QA_AUDIT_REPORT.md)** - ⚠️ **ВАЖНО**: отчет о качестве кода и найденных проблемах
- **[Аудит безопасности](development/SECURITY_AUDIT_REPORT.md)** - полный аудит безопасности, уязвимости, легаси, план решения
- **[Инструкции по рефакторингу безопасности](development/security-refactoring-implementation-guide.md)** - поэтапные инструкции для программистов
- **[Руководство по рефакторингу](development/REFACTORING_GUIDE.md)** - план рефакторинга и улучшения кода
- **[Требования к версиям зависимостей](development/dependencies-version-requirements.md)** - ⚠️ **КРИТИЧЕСКИ ВАЖНО**: требования к версиям библиотек
- **[Настройка автоматических обновлений](development/auto-updates-setup.md)** - руководство по настройке системы автоматических обновлений
- **[Руководство по миграции на Vitest](development/vitest-migration-guide.md)** - пошаговая инструкция по миграции с Jest на Vitest
- **[План внедрения импорта/экспорта настроек](development/settings-import-export-plan.md)** - описание реализации функционала импорта/экспорта настроек
- **[План миграции на TypeScript](development/typescript-migration-plan.md)** - завершённая миграция: src и тесты на TypeScript (.ts/.tsx)
- **[Варианты волейбола (зал, пляж, снежный)](development/volleyball-variants.md)** - правила счёта и архитектура реализации
- **[Автоматические плашки событий vMix (сетбол, матчбол, таймаут)](development/vmix-event-overlays.md)** - анализ, план реализации, доработки и рефакторинг
- **[UX-рефакторинг сопоставления полей vMix ↔ данные приложения](development/vmix-field-mapping-ux-refactoring-plan.md)** - план улучшений UX: поиск, группировка, избранное, массовые операции, обозреватель сопоставлений
- **[Инструкция: UX-рефакторинг сопоставления полей vMix ↔ данные приложения](development/vmix-field-mapping-ux-refactoring-implementation-guide.md)** - этапы реализации для программиста (поиск, пикеры, mass-mapping Rosters/Lineup, copy/paste, обозреватель)
- **[Защита от декомпиляции](development/obfuscation-and-protection.md)** - варианты защиты Electron приложения от декомпиляции

### 🔧 Устранение проблем
- **[Сводка проблем с логотипами](troubleshooting/logo-issues-summary.md)** - все решенные проблемы с логотипами
- **[Исправление XSS уязвимости](troubleshooting/XSS_FIX_SUMMARY.md)** - описание исправления XSS уязвимостей
- **[Аудит подключения к vMix](troubleshooting/vmix-connection-audit-report.md)** - проверка обработки недоступности vMix
- **[Недоступные поля ввода в Electron](troubleshooting/electron-input-focus-bug.md)** - баг с фокусом после alert/confirm; анализ, решение внедрено (IPC-диалоги)
- **[Белая полоска под меню при 125% DPI](troubleshooting/windows-125-percent-dpi-menu-gap-analysis.md)** - визуальный артефакт при масштабировании Windows; анализ, известный баг Chromium/Electron

## 🗂️ Структура документации

```
docs/
├── README.md                    # Этот файл - навигация
├── getting-started/             # Начало работы
│   ├── app-description.md
│   └── ui-structure.md
├── architecture/                # Архитектура проекта
│   ├── ARCHITECTURE.md
│   └── vmix-settings-redesign-plan.md
├── api/                         # API документация
│   ├── vmix-api-reference.md
│   └── vMix Responce Example.xml
├── testing/                     # Тестирование
│   ├── TESTING.md
│   ├── TESTING_QUICK_START.md
│   └── TESTING_SETUP_GUIDE.md
├── development/                 # Разработка
│   ├── QA_AUDIT_REPORT.md
│   ├── REFACTORING_GUIDE.md
│   ├── dependencies-version-requirements.md
│   ├── vmix-event-overlays.md  # Автоматические плашки событий vMix
│   └── [другие документы]
└── troubleshooting/             # Устранение проблем
    ├── logo-issues-summary.md
    ├── XSS_FIX_SUMMARY.md
    └── vmix-connection-audit-report.md
```

## 🔍 Быстрый поиск

### Нужно начать работу?
→ См. [Начало работы](getting-started/)

### Хотите понять архитектуру?
→ См. [Архитектура](architecture/)

### Работаете с vMix API?
→ См. [API документация](api/)

### Пишете тесты?
→ См. [Тестирование](testing/)

### Рефакторите код?
→ См. [Разработка](development/)

### Решаете проблему?
→ См. [Устранение проблем](troubleshooting/)

## 📌 Важные документы

- **[QA Аудит](development/QA_AUDIT_REPORT.md)** - ⚠️ **ОБЯЗАТЕЛЬНО К ПРОЧТЕНИЮ**: текущее состояние качества кода
- **[Требования к версиям зависимостей](development/dependencies-version-requirements.md)** - ⚠️ **КРИТИЧЕСКИ ВАЖНО**: требования к версиям библиотек
- **[README.md](../README.md)** - основная документация проекта в корне
- **[CHANGELOG.md](../CHANGELOG.md)** - история изменений

## 🤝 Вклад в документацию

При добавлении новой документации:
1. Разместите файл в соответствующей категории
2. Обновите этот README.md, добавив ссылку
3. Обновите README.md в соответствующей категории
4. Следуйте существующей структуре и стилю

---

*Последнее обновление: 2026-03-26*
