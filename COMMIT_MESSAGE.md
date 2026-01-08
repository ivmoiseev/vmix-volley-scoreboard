# Текст коммита

```
Разделение инпутов составов на команды и исправление идентификации инпутов

Основные изменения:

1. Разделение инпутов составов на команды A и B:
   - Добавлены отдельные инпуты rosterTeamA, rosterTeamB, startingLineupTeamA, startingLineupTeamB
   - Реализована передача данных для новых инпутов через функции updateRosterTeamAInput/updateRosterTeamBInput
   - Добавлена автоматическая миграция старых инпутов roster и startingLineup в новый формат
   - Обновлены конфигурации полей для всех инпутов составов с поддержкой 14 игроков

2. Исправление идентификации инпутов vMix:
   - Переименована normalizeInputIdentifier() → findInputInMap()
   - Расширен inputsMap для хранения полной информации об инпутах (number, key, title, shortTitle, type)
   - Переработана логика isOverlayActive() для корректного сравнения инпутов на основе данных из vMix API
   - Исправлена проблема некорректной идентификации инпутов при сравнении строк типа "Input3" с номерами

3. Поддержка игроков без номера:
   - Разрешено значение null для номера игрока
   - Обновлена валидация номера игрока: отрицательные числа преобразуются в null
   - При генерации следующего номера учитываются только игроки с номерами
   - Обновлено отображение игроков без номера в стартовом составе

Затронутые файлы:
- src/main/settingsManager.js - миграция настроек
- src/main/vmix-client.js - расширение inputsMap
- src/main/vmix-input-configs.js - новые конфигурации инпутов
- src/renderer/hooks/useVMix.js - рефакторинг идентификации и новые функции для составов
- src/renderer/components/VMixOverlayButtons.jsx - новые кнопки управления
- src/renderer/pages/RosterManagementPage.jsx - поддержка игроков без номера
- src/renderer/pages/VMixSettingsPage.jsx - обновление UI для новых инпутов

Документация:
- Создан docs/roster-inputs-split-and-improvements.md
- Обновлен CHANGELOG.md
```
