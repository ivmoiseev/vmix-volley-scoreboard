# Текст коммита

```
Оптимизация отправки команд в vMix и исправление обновления логотипов

Основные изменения:

1. Оптимизация отправки команд в vMix:
   - Реализована система отслеживания изменений полей для минимизации обращений к vMix API
   - Кэширование последних отправленных значений для каждого инпута (currentScore, lineup, rosterTeamA, rosterTeamB)
   - Отправка только измененных полей вместо всех полей при каждом обновлении
   - Функции фильтрации измененных полей: filterChangedFields, filterChangedColorFields, filterChangedVisibilityFields, filterChangedImageFields
   - Параметр forceUpdate для принудительного обновления всех полей (используется при создании/открытии матча, сохранении настроек)
   - Автоматический сброс кэша при смене матча (по matchId), переподключении к vMix, изменении конфигурации инпутов
   - Значительное снижение нагрузки на vMix API и улучшение производительности

2. Исправление обновления логотипов при смене команд:
   - Исправлена проблема, когда логотипы не обновлялись в vMix после смены команд местами
   - Добавлен timestamp к URL логотипов при принудительном обновлении (forceUpdate=true) для гарантированного перезагрузки изображений
   - Формат URL: logo_a.png?t=1234567890
   - Добавлена функция resetImageFieldsCache() в хук useVMix для сброса кэша логотипов
   - Логотипы теперь корректно обновляются при смене команд, сохранении настроек матча и списков команд

3. Автоматическая очистка папки logos:
   - Добавлена функция cleanupLogosDirectory() для удаления устаревших файлов логотипов
   - Очистка выполняется автоматически при:
     * Старте приложения
     * Сохранении матча (fileManager.saveMatch)
     * Смене команд местами (match:swap-teams)
     * Установке матча для мобильного сервера (mobile:set-match)
   - В папке logos остаются только актуальные файлы: logo_a.png, logo_b.png и .gitkeep
   - Безопасная обработка ошибок (не прерывает выполнение при ошибках)

Технические детали:

- Система кэширования использует useRef для хранения lastSentValuesRef с структурой:
  { inputKey: { fields: {}, colorFields: {}, visibilityFields: {}, imageFields: {} } }
- Сравнение значений с нормализацией (цвета в HEX формате, строки с trim)
- При forceUpdate=true отправляются все поля независимо от кэша
- Исключения для forceUpdate=true:
  * Создание нового матча
  * Открытие матча из файла
  * Сохранение настроек матча (MatchSettingsPage.handleSave)
  * Сохранение списков команд (RosterManagementPage.handleSave)
  * Смена команд местами
  * Ручное обновление через F5 (меню "Вид" → "Обновить данные в vMix")

Затронутые файлы:
- src/renderer/hooks/useVMix.js - система кэширования, фильтрация изменений, forceUpdate, resetImageFieldsCache
- src/renderer/pages/MatchControlPage.jsx - отслеживание первой загрузки матча, поддержка forceUpdateFromState
- src/renderer/pages/MatchSettingsPage.jsx - использование forceUpdate при сохранении и смене команд, resetImageFieldsCache
- src/renderer/pages/RosterManagementPage.jsx - использование forceUpdate при сохранении списков команд
- src/renderer/App.jsx - поддержка forceUpdateVMix флага для F5 обновления
- src/main/logoManager.js - функция cleanupLogosDirectory для очистки устаревших файлов
- src/main/fileManager.js - вызов cleanupLogosDirectory при сохранении матча
- src/main/main.js - вызов cleanupLogosDirectory при старте, смене команд, установке матча для мобильного сервера

Документация:
- Обновлен CHANGELOG.md - добавлены разделы об оптимизации, исправлении логотипов и очистке logos
- Обновлен docs/ARCHITECTURE.md - описание механизма оптимизации, кэширования, потоков данных, обновлен logoManager
- Обновлен docs/app-description.md - описание оптимизированного обновления и автоматической очистки logos
```
