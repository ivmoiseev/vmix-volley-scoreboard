feat(overlay): intro/rosters — дизайн, API (matchDate, city, positionShort), форматирование даты для vMix

Overlay-страницы:
- Intro: центрированный синий блок с градиентной полоской; турнир, команды (логотипы + названия + города), место, дата/время (ДД.ММ.ГГГГ ЧЧ:ММ, без timezone)
- Rosters: центрированный синий блок с полоской; колонка Поз. (OH/MB/OPP/S/L), симметричные колонки, ширина под 14 игроков без scale; неразрывный пробел перед * у стартовых
- API GET /api/overlay/match: matchDate, date в формате ДД.ММ.ГГГГ, city в командах, positionShort в roster (getPositionAbbreviation)

Форматирование даты:
- getValueByDataMapKey: ключ date возвращает ДД.ММ.ГГГГ; formatMatchDate экспортирована
- MatchControlPage: использует formatMatchDate для отображения даты (без дублирования логики)
- vmix-data-map.md: обновлено описание поля date (формат в vMix)

Документация:
- overlay-pages-browser-source-plan.md — раздел «Текущая реализация», обновлены 6.2–6.3, чек-лист
- vmix-current-functionality.md — 6.1 API overlay, 5.3 дата/formatMatchDate, ссылка на overlay-plan
- CHANGELOG: раздел [Unreleased] дополнен
