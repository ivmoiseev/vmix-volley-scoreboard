test: Покрытие тестами рефакторинга инпутов vMix и исправление тестов MobileAccessPage

Тесты и рефакторинг:
- Добавлены юнит-тесты для getValueByDataMapKey (tests/unit/shared/getValueByDataMapKey.test.js)
- Вынесены resolveLogoUrlsInImageFields и findInputConfig в src/main/vmix-overlay-utils.ts для тестирования
- Добавлены тесты vmix-overlay-utils (tests/unit/main/vmix-overlay-utils.test.ts)
- Добавлены тесты VMixOverlayButtons, VMixInputFieldsPanel, useVMix-dynamic-inputs, VMixSettingsPage
- Исправлены падающие тесты MobileAccessPage: getByRole для кнопок, running в моках getMobileServerInfo, синхронизация моков с window.electronAPI, мок QRCodeCanvas без getContext

Документация:
- Обновлены docs/development/README.md, docs/testing/README.md, docs/architecture/ARCHITECTURE.md
- Добавлен раздел 12.4 в vmix-inputs-refactoring-implementation-guide.md (список добавленных тестов)
- Обновлены COMMIT_MESSAGE.md и CHANGELOG.md

---

fix: Замена библиотеки QR-кода для исправления ошибки в production (v1.0.9)

Критическое исправление:
- Заменена библиотека qrcode на qrcode.react
- Исправлена ошибка "g.find_path is not a function" в production сборке
- QR-код теперь работает корректно в production режиме
- Удалена зависимость @types/qrcode

Детали:
- Обновлен код MobileAccessPage для работы с qrcode.react
- Использование QRCodeCanvas компонента вместо асинхронного API
- Удалены упоминания qrcode из vite.config.js
- Созданы тесты для MobileAccessPage
- Добавлена документация о замене библиотеки

---

feat: Добавлен импорт/экспорт настроек и улучшения UX (v1.0.8)

Основные изменения:
- Добавлен функционал импорта и экспорта настроек с валидацией
- Улучшен UX: убраны модальные окна при сохранении, страницы закрываются автоматически
- Исправлена проблема с QR-кодом: переход на клиентскую генерацию
- Очистка проекта: удалены все скомпилированные .js файлы (28 файлов)
- Исправлены ошибки сборки и оптимизированы импорты

Детали:
- Новый модуль settingsImportExport.ts с полной валидацией
- Валидатор настроек settingsValidator.ts
- Полное покрытие тестами (юнит + интеграционные)
- Обновлена документация
- Обновлен .gitignore для предотвращения попадания скомпилированных файлов

---

fix: исправление ошибки с electron-updater в production сборке

Исправление ошибки "Cannot find package 'electron-updater'":
- Перемещен electron-updater из devDependencies в dependencies
- electron-builder не включает devDependencies в production сборку
- Пакет теперь корректно доступен в ASAR архиве
- Добавлена документация по решению проблемы

refactor(docs): рефакторинг документации - удаление устаревших документов и объединение дубликатов

Рефакторинг документации:
- Удалено 18 устаревших документов:
  * Завершенные миграции (ES модули, TypeScript)
  * Завершенные планы рефакторинга (логотипы, типы полей, состояния партий)
  * Устаревшие отчеты о тестировании (5 документов)
  * Дублирующиеся troubleshooting документы (5 документов о логотипах)
  * Устаревшие анализы и объяснения

- Объединены документы:
  * 3 документа о проблемах с логотипами → logo-issues-summary.md
  * Все решенные проблемы с логотипами теперь в одном месте

- Обновлены README файлы:
  * docs/README.md - упрощенная навигация
  * docs/development/README.md - актуальный список документов
  * docs/testing/README.md - только актуальные руководства
  * docs/troubleshooting/README.md - обновленный список

- Обновлен QA_AUDIT_REPORT.md:
  * Отмечено что исправлено с предыдущего аудита
  * Обновлены статусы проблем
  * Добавлены текущие рекомендации
  * Общая оценка улучшена с 6.5/10 до 7.5/10

Результат:
- Документация стала более структурированной и актуальной
- Убрано дублирование информации
- Упрощена навигация по документации
- Оставлены только важные и актуальные документы
- QA_AUDIT_REPORT.md сохранен как обязательный документ

Технические детали:
- Удалено: 18 устаревших документов
- Объединено: 3 документа в 1
- Обновлено: 4 README файла + QA_AUDIT_REPORT.md
- Создано: logo-issues-summary.md (объединенный документ)
