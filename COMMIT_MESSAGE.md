feat(roster): блок «Внешний вид команды», экспорт/импорт с логотипом и цветами; fix(overlay): логотип команды A на intro

Рефакторинг страницы «Управление составами»:
- Блок «Внешний вид команды»: название, город, логотип (TeamLogoEditor), цвета формы и либеро (TeamColorsEditor). Используются на MatchSettingsPage и RosterManagementPage.
- Типы Team: logoPath?, logoBase64?, city?.
- Экспорт/импорт: name, city, coach, roster, startingLineupOrder, color, liberoColor, logoBase64; при импорте логотипа — saveLogoToFile и подстановка в match.
- Тесты RosterManagementPage обновлены; документация ui-structure.md и roster-management-refactoring-plan.md (описание выполненных изменений).

Исправление overlay intro (мобильный сервер):
- В server.ts при формировании logoUrl проверка existsSync(файл по logoPath); при отсутствии файла — fallback на logoBase64/logo (data URL), чтобы не отдавать битую ссылку для команды A.
