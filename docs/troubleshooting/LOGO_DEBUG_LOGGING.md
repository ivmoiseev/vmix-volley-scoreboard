# Логирование для отладки проблемы с логотипами

**Дата:** 2024  
**Цель:** Отследить проблему с логотипами в инпуте "Заявка" после смены команд местами и сохранения настроек

---

## Добавленное логирование

### 1. HTTP API команды в vMix (`src/main/vmix-client.js`)

**Логируется:**
- Все команды vMix API с деталями (функция, инпут, поле, значение)
- Полный HTTP URL запроса
- Специальное логирование для `SetImage` с логотипами

**Пример вывода:**
```
[vMix API] SetImage → Input3
  Поле: TeamLogo
  Значение: http://192.168.1.100:3000/logos/logo_a.png
  [SetImage Logo] Полный URL: http://192.168.1.100:3000/logos/logo_a.png
  Полный HTTP запрос: http://localhost:8088/api/?Function=SetImage&Input=Input3&SelectedName=TeamLogo&Value=http%3A%2F%2F192.168.1.100%3A3000%2Flogos%2Flogo_a.png
```

### 2. Формирование данных для инпутов составов (`src/renderer/hooks/useVMix.js`)

**В `formatRosterData`:**
- Логируется teamKey и inputKey при вызове
- Логируется имя команды и logoPath
- Логируются итоговые imageFields

**В `getRosterFieldValue`:**
- Логируется формирование URL логотипа
- Логируется teamKey, logoFileName, и сформированный URL
- Предупреждение, если logoPath команды не соответствует logoFileName

**В `updateRosterTeamAInput` и `updateRosterTeamBInput`:**
- Логируются логотипы перед отправкой в vMix
- Проверка правильности имени файла (logo_a.png для команды A, logo_b.png для команды B)

**Пример вывода:**
```
[formatRosterData] Вызов для teamKey=A, inputKey=rosterTeamA
  team.name: Команда A
  team.logoPath: logos/logo_a.png
[getRosterFieldValue] teamLogo для teamKey=A:
  team.name: Команда A
  team.logoPath: logos/logo_a.png
  logoFileName (из teamKey): logo_a.png
  Сформированный URL: http://192.168.1.100:3000/logos/logo_a.png
[formatRosterData] Итоговые imageFields для teamKey=A:
  TeamLogo: http://192.168.1.100:3000/logos/logo_a.png
[updateRosterTeamAInput] Логотипы для команды A:
  TeamLogo: http://192.168.1.100:3000/logos/logo_a.png
    [DEBUG] teamKey=A, ожидаемый файл: logo_a.png, URL содержит: logo_a.png ✓
```

### 3. Сохранение настроек матча (`src/renderer/pages/MatchSettingsPage.jsx`)

**Логируется:**
- Матч до вызова `setCurrentMatch`
- Матч после вызова `setCurrentMatch` (с обновленными logoPath)
- Матч, используемый для обновления vMix

**Пример вывода:**
```
[MatchSettingsPage handleSave] До setCurrentMatch:
  teamA.name: Команда A, logoPath: logos/logo_a.png
  teamB.name: Команда B, logoPath: logos/logo_b.png
[match:set-current] Начало обработки матча:
  teamA.name: Команда A, logoPath: logos/logo_a.png
  teamB.name: Команда B, logoPath: logos/logo_b.png
[match:set-current] teamA: logoPath обновлен с "logos/logo_a.png" на "logos/logo_a.png"
[match:set-current] teamB: logoPath обновлен с "logos/logo_b.png" на "logos/logo_b.png"
[match:set-current] После обработки:
  teamA.name: Команда A, logoPath: logos/logo_a.png
  teamB.name: Команда B, logoPath: logos/logo_b.png
[MatchSettingsPage handleSave] После setCurrentMatch (обновленный матч):
  teamA.name: Команда A, logoPath: logos/logo_a.png
  teamB.name: Команда B, logoPath: logos/logo_b.png
[MatchSettingsPage handleSave] Обновление данных в vMix:
  Используемый матч: teamA.name=Команда A, teamB.name=Команда B
  teamA.logoPath: logos/logo_a.png
  teamB.logoPath: logos/logo_b.png
```

### 4. Обработка матча в main процессе (`src/main/main.js`)

**В `match:set-current`:**
- Логируется матч до и после обработки логотипов
- Логируется обновление logoPath для каждой команды

---

## Как использовать логирование

### Сценарий тестирования:

1. Откройте консоль разработчика (F12) или терминал с запущенным приложением
2. Выполните следующие действия:
   - Откройте матч с двумя командами и логотипами
   - Нажмите "Поменять команды местами"
   - Нажмите "Сохранить изменения" в настройках матча
3. Проверьте логи:
   - Найдите все записи `[formatRosterData]`, `[getRosterFieldValue]`, `[updateRosterTeamAInput]`, `[updateRosterTeamBInput]`
   - Проверьте, какие URL логотипов отправляются в vMix
   - Проверьте, соответствуют ли они правильным командам

### Что искать в логах:

1. **Правильность teamKey:**
   - Для `rosterTeamA` должен быть `teamKey=A` и `logoFileName=logo_a.png`
   - Для `rosterTeamB` должен быть `teamKey=B` и `logoFileName=logo_b.png`

2. **Правильность URL:**
   - Для команды A должен быть URL с `logo_a.png`
   - Для команды B должен быть URL с `logo_b.png`

3. **Правильность матча:**
   - После `setCurrentMatch` logoPath должны быть обновлены
   - При обновлении vMix должен использоваться матч с правильными logoPath

4. **Порядок вызовов:**
   - Проверьте, в каком порядке вызываются функции
   - Проверьте, не происходит ли двойное обновление

---

## Ожидаемое поведение

### После смены команд местами:

1. `match:swap-teams` сохраняет логотипы в правильные файлы:
   - Оригинальный логотип команды B → `logo_a.png`
   - Оригинальный логотип команды A → `logo_b.png`

2. `match:set-current` обновляет logoPath:
   - `teamA.logoPath = "logos/logo_a.png"`
   - `teamB.logoPath = "logos/logo_b.png"`

3. При обновлении vMix:
   - `rosterTeamA` (teamKey=A) → `logo_a.png` ✓
   - `rosterTeamB` (teamKey=B) → `logo_b.png` ✓

### После сохранения настроек:

1. `handleSave` вызывает `setCurrentMatch` с обновленным матчем
2. `setCurrentMatch` обновляет logoPath в матче
3. Используется обновленный матч для `updateMatchData`
4. В vMix отправляются правильные URL логотипов

---

## Возможные проблемы

### Проблема 1: Неправильный teamKey

**Симптом:** В логах видно, что для `rosterTeamA` используется `teamKey=B`

**Решение:** Проверить логику вызова `formatRosterData` в `updateRosterTeamAInput` и `updateRosterTeamBInput`

### Проблема 2: Неправильный матч при сохранении

**Симптом:** В логах видно, что используется старый матч без обновленных logoPath

**Решение:** Убедиться, что используется `finalMatch` из результата `setCurrentMatch`

### Проблема 3: Двойное обновление

**Симптом:** В логах видно два вызова `updateRosterTeamAInput` или `updateRosterTeamBInput`

**Решение:** Проверить, не вызывается ли `updateMatchData` дважды

---

## Отключение логирования

После отладки можно отключить логирование, закомментировав или удалив соответствующие `console.log` и `console.warn` вызовы.

---

**Дата создания:** 2024  
**Версия:** 1.0
