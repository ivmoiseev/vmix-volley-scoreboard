fix(electron): замена alert/confirm на IPC-диалоги — исправление бага с фокусом в полях ввода

Проблема: после вызова alert() или confirm() в рендерере текстовые поля переставали
принимать ввод с клавиатуры (Electron #20821). Решение: перенос показа сообщений
и подтверждений в main-процесс через dialog.showMessageBox и вызов из рендерера по IPC.

Код:
- Main: src/main/dialogHandlers.ts — registerDialogHandlers(ipcMain, dialog, getWindow),
  обработчики dialog:show-message и dialog:show-confirm. Регистрация в main.ts.
- Preload: в electronAPI добавлены showMessage и showConfirm.
- Рендерер: во всех 8 файлах (MatchSettingsPage, RosterManagementPage, MatchControlPage,
  VMixSettingsPage, WelcomePage, Layout, MobileAccessPage, useMatch) заменены alert/confirm
  на window.electronAPI?.showMessage?.() и showConfirm?.().

Тесты:
- tests/unit/main/dialogHandlers.test.ts — вызов showMessageBox и возврат результата.
- tests/setup.ts — моки showMessage и showConfirm в global.electronAPI.
- Обновлены MatchSettingsPage (showConfirm при отмене смены команд), RosterManagementPage
  и useMatch (проверки вызовов showMessage).

Исправление сборки TypeScript:
- useMatch.ts: приведение типа для window.electronAPI; Match → MatchForMigration при
  migrateMatchToSetStatus; match → MatchWithVariant при getRules.
- SetService.ts: приведение match к MatchWithVariant при вызове getRules.
- npm run compile:typescript и build:electron проходят.

Документация:
- docs/troubleshooting/electron-input-focus-bug.md — статус «решение внедрено», актуализация.
- docs/development/electron-dialog-refactoring-implementation-guide.md — этапы отмечены
  выполненными; добавлен раздел 10 «Исправление ошибок компиляции TypeScript».
- CHANGELOG.md — запись в [Unreleased]: добавлено (рефакторинг диалогов), исправлено (компиляция).
