chore(ts): завершение миграции на TypeScript и актуализация документации

Миграция на TypeScript:
- Исправлен тест App-loadMatch: путь к App.tsx с расширением (APP_FILE), все три теста проходят
- Моки: tests/__mocks__/Match.js и Match.mjs заменены на Match.ts (типизированный SET_STATUS)
- Импорт в useMatch.test.ts: useMatch.js → useMatch (без расширения)
- vite.config.js: пороги покрытия volleyballRules.ts, matchUtils.ts; убран vmix-field-utils.js из optimizeDeps

Документация:
- typescript-migration-plan.md: раздел 1 «Текущее состояние» — миграция завершена; в фазе 7 добавлен пункт про моки; чек-лист отмечен выполненным
- ARCHITECTURE.md: диаграмма и структура проекта приведены к .ts/.tsx; все ссылки на модули (main.ts, server.ts, App.tsx, useMatch.ts и др.) и preload.cjs обновлены
- docs/README.md: ссылка на план миграции TypeScript, дата 2026-02-07
- docs/development/README.md: план миграции отмечен как завершённый; расширения тестов в разделе «Тесты рефакторинга инпутов vMix» — .ts/.tsx

CHANGELOG: в [Unreleased] добавлены разделы «Миграция на TypeScript» и «Документация».
