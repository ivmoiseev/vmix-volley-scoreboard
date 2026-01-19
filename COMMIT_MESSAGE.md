docs: добавлена документация по TypeScript в production, Webpack/Rollup и аудит vMix

Добавлены новые документы:
- docs/development/typescript-in-production-explanation.md
  Объяснение проблем использования TypeScript напрямую в production сборке Electron,
  описание решений через предварительную компиляцию и сравнение подходов (tsx vs tsc)

- docs/development/webpack-rollup-vs-current-approach.md
  Детальное сравнение инструментов сборки (Webpack, Rollup) с текущим подходом (tsc),
  включая преимущества, недостатки, метрики производительности и рекомендации

- docs/troubleshooting/vmix-connection-audit-report.md
  Отчет об аудите автономности функций при недоступности vMix,
  документирование функций, работающих независимо от подключения

Обновлены документы:
- docs/troubleshooting/typescript-production-fix.md
  Полное описание решения проблемы с TypeScript в production,
  включая все этапы исправления и технические детали

- CHANGELOG.md
  Добавлена секция с описанием новой документации в раздел [Unreleased]
