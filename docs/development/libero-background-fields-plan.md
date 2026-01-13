# План добавления полей подложек либеро

## Цель

Добавить поля подложек либеро в инпуты стартового состава с автоматическим управлением цветом и видимостью.

## Текущая ситуация

### Существующие поля либеро:
- `libero1Number` - Номер либеро 1
- `libero1Name` - Имя либеро 1
- `libero1NumberOnCard` - Номер либеро 1 на карте
- `libero2Number` - Номер либеро 2
- `libero2Name` - Имя либеро 2
- `libero2NumberOnCard` - Номер либеро 2 на карте

### Данные матча:
- `match.teamA.liberoColor` - цвет формы либеро команды A
- `match.teamB.liberoColor` - цвет формы либеро команды B
- Либеро находятся в `startingLineup` по индексам 6 и 7 (после первых 6 игроков)

## Новые поля

### Для startingLineupTeamA и startingLineupTeamB:
После `libero1NumberOnCard`:
- `libero1Background` - Подложка либеро 1 (fill)
- `libero1BackgroundOnCard` - Подложка либеро 1 на карте (fill)

После `libero2NumberOnCard`:
- `libero2Background` - Подложка либеро 2 (fill)
- `libero2BackgroundOnCard` - Подложка либеро 2 на карте (fill)

## Логика работы

1. **Цвет подложки**: Используется `match.teamA.liberoColor` или `match.teamB.liberoColor` в зависимости от команды
   - Если либеро указан в стартовом составе: используется цвет из настроек (`liberoColor` или `color`)
   - Если либеро не указан: устанавливается прозрачный цвет `#00000000`
2. **Цвет текста номеров либеро**: 
   - Если либеро указан в стартовом составе: автоматически устанавливается контрастный цвет текста (черный или белый) на основе цвета подложки
   - Используется функция `getContrastTextColor()` для расчета оптимального цвета
   - Цвет текста устанавливается через команду `SetTextColour` в vMix API
   - Работает для всех полей: `Libero1Number.Text`, `Libero1NumberOnCard.Text`, `Libero2Number.Text`, `Libero2NumberOnCard.Text`

## План реализации (TDD подход)

### Этап 1: Подготовка тестов

#### 1.1 Тесты для конфигурации полей
**Файл:** `tests/unit/main/vmix-input-configs-libero-background.test.js` (новый)

Тесты должны проверить:
- Наличие полей `libero1Background` и `libero1BackgroundOnCard` в `startingLineupTeamA`
- Наличие полей `libero2Background` и `libero2BackgroundOnCard` в `startingLineupTeamA`
- Наличие полей `libero1Background` и `libero1BackgroundOnCard` в `startingLineupTeamB`
- Наличие полей `libero2Background` и `libero2BackgroundOnCard` в `startingLineupTeamB`
- Все поля имеют тип `fill`
- Правильные `fieldIdentifier` для каждого поля

#### 1.2 Тесты для обработки полей в useVMix
**Файл:** `tests/unit/renderer/useVMix-libero-background.test.js` (новый)

Тесты должны проверить:
- Правильное формирование имен полей с суффиксами для подложек либеро
- Передача цвета либеро в поля fill
- Управление видимостью: видимо, если либеро указан
- Управление видимостью: скрыто, если либеро не указан
- Обработка для обеих команд (A и B)
- Обработка обоих либеро (1 и 2)

### Этап 2: Обновление конфигураций по умолчанию

#### 2.1 Обновление vmix-input-configs.js
- Добавить поля `libero1Background` и `libero1BackgroundOnCard` после `libero1NumberOnCard`
- Добавить поля `libero2Background` и `libero2BackgroundOnCard` после `libero2NumberOnCard`
- Для обоих инпутов: `startingLineupTeamA` и `startingLineupTeamB`

Пример:
```javascript
libero1NumberOnCard: { enabled: true, type: 'text', fieldName: 'Номер либеро 1 на карте', fieldIdentifier: 'Libero1NumberOnCard' },
libero1Background: { enabled: true, type: 'fill', fieldName: 'Подложка либеро 1', fieldIdentifier: 'Libero1Background' },
libero1BackgroundOnCard: { enabled: true, type: 'fill', fieldName: 'Подложка либеро 1 на карте', fieldIdentifier: 'Libero1BackgroundOnCard' },
libero2Number: { enabled: true, type: 'text', fieldName: 'Номер либеро 2', fieldIdentifier: 'Libero2Number' },
// ...
libero2NumberOnCard: { enabled: true, type: 'text', fieldName: 'Номер либеро 2 на карте', fieldIdentifier: 'Libero2NumberOnCard' },
libero2Background: { enabled: true, type: 'fill', fieldName: 'Подложка либеро 2', fieldIdentifier: 'Libero2Background' },
libero2BackgroundOnCard: { enabled: true, type: 'fill', fieldName: 'Подложка либеро 2 на карте', fieldIdentifier: 'Libero2BackgroundOnCard' },
```

### Этап 3: Обновление логики обработки полей

#### 3.1 Обновление formatStartingLineupData в useVMix.js
- Добавить обработку полей типа `fill` для подложек либеро
- Использовать `match.teamA.liberoColor` или `match.teamB.liberoColor`
- Добавить управление видимостью через `visibilityFields`
- Проверять наличие либеро в `startingLineup[6]` и `startingLineup[7]`

Логика:
1. Определить, какой либеро (1 или 2) по индексу в `startingLineup`
2. Проверить наличие либеро в массиве
3. Если либеро есть:
   - Установить цвет подложки из `team.liberoColor`
   - Установить видимость = true
4. Если либеро нет:
   - Установить видимость = false
   - Цвет не устанавливаем (или устанавливаем прозрачный)

#### 3.2 Обновление структуры возвращаемых данных
- Добавить `colorFields` в возвращаемые данные `formatStartingLineupData`
- Добавить `visibilityFields` для управления видимостью подложек

### Этап 4: Обновление вызова formatStartingLineupData

#### 4.1 Обновление updateStartingLineupData в useVMix.js
- Передать `colorFields` и `visibilityFields` в `updateVMixInputFields`
- Убедиться, что видимость обрабатывается правильно

## Порядок выполнения

1. ✅ **Этап 1**: Написать все тесты (они должны падать)
2. ✅ **Этап 2**: Обновить конфигурации по умолчанию
3. ✅ **Этап 3**: Обновить логику обработки полей
4. ✅ **Этап 4**: Обновить вызовы функций
5. ✅ **Этап 5**: Запустить тесты и проверить работу

## Дополнительная функциональность: Контрастный цвет текста для полей номеров либеро

### Реализовано
- Автоматическая установка контрастного цвета текста для полей номеров либеро
- Используется функция `getContrastTextColor()` для расчета оптимального цвета (черный или белый)
- Цвет текста определяется на основе цвета подложки либеро из настроек матча
- Устанавливается только если либеро указан в стартовом составе
- Работает для всех полей: `Libero1Number.Text`, `Libero1NumberOnCard.Text`, `Libero2Number.Text`, `Libero2NumberOnCard.Text`
- Используется команда `SetTextColour` в vMix API для установки цвета текста в GT Titles

### Технические детали
- Добавлен метод `setTextColour()` в `vmix-client.js`
- Добавлен параметр `textColorFields` в `updateInputFields()`
- Обновлены IPC handlers для поддержки `textColorFields`
- Добавлены тесты в `tests/unit/main/vmix-client-text-color.test.js`

## Детали реализации

### Обработка полей fill для подложек

В `formatStartingLineupData` нужно добавить обработку после обработки полей изображений:

```javascript
// Обработка полей fill для подложек либеро
if (fieldConfig.type === FIELD_TYPES.FILL) {
  const liberoBackgroundMatch = fieldKey.match(/^libero(\d+)(Background|BackgroundOnCard)$/);
  if (liberoBackgroundMatch) {
    const liberoIndex = parseInt(liberoBackgroundMatch[1]) - 1; // 0 или 1
    const startingLineupIndex = liberoIndex + 6; // 6 или 7
    const libero = startingLineup[startingLineupIndex];
    
    if (libero && fullFieldName) {
      // Либеро указан - устанавливаем цвет и видимость
      const liberoColor = team.liberoColor || team.color || "#ffffff";
      colorFields[fullFieldName] = normalizeColor(liberoColor, "#ffffff");
      visibilityFields[fullFieldName] = { visible: true, fieldConfig };
    } else if (fullFieldName) {
      // Либеро не указан - скрываем подложку
      visibilityFields[fullFieldName] = { visible: false, fieldConfig };
    }
    return;
  }
}
```

### Управление видимостью

Для полей fill видимость управляется через `SetTextVisibleOn`/`SetTextVisibleOff`, но нужно сначала установить цвет (даже прозрачный), а затем управлять видимостью.

## Обратная совместимость

- Старые конфигурации автоматически получат новые поля через миграцию в `migrateInputToNewFormat`
- Если `liberoColor` не указан, используется цвет команды или белый по умолчанию

## Риски и меры предосторожности

1. **Отсутствие liberoColor**: 
   - Использовать fallback на цвет команды или белый
   - Добавить валидацию цвета

2. **Индексация либеро**:
   - Убедиться, что индексы 6 и 7 корректны для либеро
   - Проверить границы массива

3. **Управление видимостью**:
   - Убедиться, что видимость правильно обрабатывается для полей fill
   - Проверить, что скрытие работает корректно
