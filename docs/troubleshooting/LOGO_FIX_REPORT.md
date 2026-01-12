# Отчет об исправлении проблемы с логотипами в инпуте "Заявка"

**Дата:** 2024  
**Статус:** ✅ Исправлено

---

## Проблема

После нажатия кнопки "Поменять команды местами" на странице "Настройки матча":
1. ✅ Вся информация, включая логотипы, правильно меняется местами
2. ✅ В vMix все отображается правильно после смены
3. ❌ При последующем нажатии "Сохранить изменения" логотипы в vMix снова меняются местами, возвращаясь в исходное положение
4. ❌ Логотипы в vMix перестают соответствовать названию команды
5. ⚠️ Проблема появляется только в инпуте "Заявка" (rosterTeamA/rosterTeamB)

---

## Причина проблемы

### 1. Не обновлялись `logoPath` в матче после сохранения

В `main.js` при вызове `setCurrentMatch`:
- Вызывался `processTeamLogoForSave` для обеих команд
- Но обновленные `logoPath` не сохранялись обратно в матч
- Матч оставался с устаревшими `logoPath`

### 2. Не использовался обновленный матч при сохранении настроек

В `MatchSettingsPage.jsx`:
- Вызывался `setCurrentMatch(updatedMatch)`
- Но обновленный матч с правильными `logoPath` не возвращался
- Использовался старый матч с неправильными `logoPath`

### 3. Логика формирования URL логотипа

В `useVMix.js` функция `getRosterFieldValue`:
- ✅ Правильно использует `teamKey` для определения имени файла (`logo_a.png` или `logo_b.png`)
- ✅ Не зависит от `logoPath` в команде
- ⚠️ Но если `logoPath` неправильный, это может влиять на проверку наличия логотипа

---

## Исправления

### 1. Обновление `logoPath` в матче после сохранения

**Файл:** `src/main/main.js`

```javascript
ipcMain.handle("match:set-current", async (event, match) => {
  // Сохраняем логотипы в файлы при обновлении матча
  // ВАЖНО: Обновляем logoPath в матче после сохранения
  try {
    if (match && match.teamA) {
      const processedTeamA = await logoManager.processTeamLogoForSave(match.teamA, "A");
      // Обновляем logoPath в матче, чтобы он соответствовал файлу на диске
      match.teamA.logoPath = processedTeamA.logoPath;
      match.teamA.logoBase64 = processedTeamA.logoBase64;
    }
    if (match && match.teamB) {
      const processedTeamB = await logoManager.processTeamLogoForSave(match.teamB, "B");
      // Обновляем logoPath в матче, чтобы он соответствовал файлу на диске
      match.teamB.logoPath = processedTeamB.logoPath;
      match.teamB.logoBase64 = processedTeamB.logoBase64;
    }
  } catch (error) {
    // ...
  }

  // Возвращаем обновленный матч с правильными logoPath
  return { success: true, match };
});
```

### 2. Использование обновленного матча при сохранении настроек

**Файл:** `src/renderer/pages/MatchSettingsPage.jsx`

```javascript
const handleSave = async () => {
  // ...
  
  // ВАЖНО: setCurrentMatch обновляет logoPath в матче, поэтому используем обновленный матч
  let finalMatch = updatedMatch;
  if (window.electronAPI) {
    try {
      const result = await window.electronAPI.setCurrentMatch(updatedMatch);
      // Используем обновленный матч из результата, если он есть (с правильными logoPath)
      if (result && result.match) {
        finalMatch = result.match;
      }
      await window.electronAPI.setMobileMatch(finalMatch);
    } catch (error) {
      // ...
    }
  }

  // Используем finalMatch везде
  if (onMatchChange) {
    onMatchChange(finalMatch);
  }
  setMatch(finalMatch);
  
  // ВАЖНО: Используем finalMatch с обновленными logoPath
  if (connectionStatus.connected) {
    resetImageFieldsCache();
    updateMatchData(finalMatch, true); // Используем finalMatch, а не updatedMatch
    // ...
  }
  
  navigate('/match', { state: { match: finalMatch } });
};
```

---

## Тесты

### 1. Тесты для проверки логики формирования URL

**Файл:** `tests/unit/renderer/useVMix-roster-logo.test.js`

Проверяют:
- ✅ Правильное формирование URL для команды A (`logo_a.png`)
- ✅ Правильное формирование URL для команды B (`logo_b.png`)
- ✅ Использование `teamKey` для определения имени файла, а не `logoPath` из команды
- ✅ Корректная работа после смены команд местами

### 2. Тесты для проверки HTTP API команд

**Файл:** `tests/unit/main/vmix-client-logo-api.test.js`

Проверяют:
- ✅ Правильный формат HTTP запроса `SetImage` для логотипов
- ✅ Правильные URL логотипов для команды A и B
- ✅ Корректная работа после смены команд местами

---

## Проверка исправления

### Сценарий тестирования:

1. ✅ Открыть матч с двумя командами и логотипами
2. ✅ Нажать "Поменять команды местами"
3. ✅ Проверить, что в vMix логотипы отображаются правильно
4. ✅ Нажать "Сохранить изменения"
5. ✅ Проверить, что в vMix логотипы остаются правильными

### Ожидаемое поведение:

- ✅ После смены команд местами логотипы меняются местами в vMix
- ✅ После сохранения настроек логотипы остаются правильными в vMix
- ✅ Логотипы соответствуют названиям команд в инпуте "Заявка"

---

## Технические детали

### Как работает формирование URL логотипа:

1. В `getRosterFieldValue` используется `teamKey` для определения имени файла:
   ```javascript
   const logoFileName = teamKey === "A" ? "logo_a.png" : "logo_b.png";
   ```

2. URL формируется независимо от `logoPath` в команде:
   ```javascript
   return hasLogo ? `${logoBaseUrl}/${logoFileName}` : "";
   ```

3. Это гарантирует, что:
   - Для `rosterTeamA` (teamKey = 'A') всегда используется `logo_a.png`
   - Для `rosterTeamB` (teamKey = 'B') всегда используется `logo_b.png`

### Как работает сохранение логотипов:

1. При смене команд местами:
   - Оригинальный логотип команды B сохраняется в `logo_a.png`
   - Оригинальный логотип команды A сохраняется в `logo_b.png`
   - Обновляются `logoPath` в матче

2. При сохранении настроек:
   - Вызывается `setCurrentMatch`, который обновляет `logoPath`
   - Используется обновленный матч с правильными `logoPath`
   - Отправляются правильные URL в vMix

---

## Измененные файлы

1. ✅ `src/main/main.js` - обновление `logoPath` в матче после сохранения
2. ✅ `src/renderer/pages/MatchSettingsPage.jsx` - использование обновленного матча
3. ✅ `tests/unit/renderer/useVMix-roster-logo.test.js` - тесты для проверки логики
4. ✅ `tests/unit/main/vmix-client-logo-api.test.js` - тесты для проверки HTTP API

---

## Результат

✅ Проблема исправлена  
✅ Логотипы правильно отображаются в инпуте "Заявка" после смены команд местами и сохранения настроек  
✅ Все тесты проходят

---

**Дата создания:** 2024  
**Версия:** 1.0
