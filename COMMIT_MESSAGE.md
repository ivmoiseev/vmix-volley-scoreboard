feat(ui): Система дизайна (design tokens), тёмная тема и актуализация документации

Дизайн и темы:
- Design tokens: src/shared/theme/tokens.js (светлая/тёмная тема, space, radius, typography), applyTheme.js для применения к DOM
- Настройка ui.theme в settings.json, переключение через меню Вид → «Переключить тему (светлая ↔ тёмная)» (кнопка в header убрана)
- Тёмная тема на градациях серого; мобильная панель подставляет токены из настроек
- Компонент Button, глобальные стили полей ввода (input/select/textarea) в цветах темы
- ScoreDisplay: фиксированная ширина блоков, рамка подающей команды, плашки сетбол/матчбол под счётом, логотипы не сжимаются
- Оформление страниц (Welcome, MobileAccess, MatchSettings, RosterManagement, VMixSettings) под тему
- Доступность: :focus-visible в index.html

Документация:
- Добавлен docs/development/DESIGN.md — единое описание системы дизайна
- Обновлены ui-structure.md (меню, тема), ui-ux-audit-report.md и design-refactoring-implementation-guide.md (статус, ссылки на DESIGN)
- Удалены design-theme-and-score-fixes-plan.md и dark-theme-inputs-analysis.md
- Обновлены docs/README.md и docs/development/README.md

CHANGELOG: раздел [Unreleased] дополнен блоком «Система дизайна и тёмная тема», «Изменено» (оформление), «Документация».