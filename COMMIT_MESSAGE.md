# Текст коммита

```
feat: добавлен контрастный цвет текста для полей номеров либеро и исправлены отступы в header

Добавлено:
- Автоматическая установка контрастного цвета текста для полей номеров либеро
  (Libero1Number, Libero1NumberOnCard, Libero2Number, Libero2NumberOnCard)
- Поддержка команды SetTextColour в vMix API для установки цвета текста в GT Titles
- Тесты для новой функциональности (vmix-client-text-color.test.js)
- Обновлены тесты useVMix-libero-background.test.js для проверки контрастного цвета

Исправлено:
- Единообразные отступы в header на всех страницах (maxWidth: 1600px, margin: 0 auto)

Технические детали:
- useVMix.js: добавлена обработка полей номеров либеро для установки контрастного цвета
- vmix-client.js: добавлен метод setTextColour() для команды SetTextColour
- updateInputFields: добавлен параметр textColorFields для передачи цветов текста
- IPC handlers: обновлены для поддержки textColorFields
- Layout.jsx: добавлены отступы в header для всех страниц

Основные изменения:

1. Контрастный цвет текста для полей номеров либеро:
   - Автоматическая установка контрастного цвета текста на основе цвета подложки либеро
   - Используется функция getContrastTextColor() для расчета оптимального цвета
   - Цвет текста устанавливается только если либеро указан в стартовом составе
   - Работает для всех полей: Libero1Number.Text, Libero1NumberOnCard.Text, 
     Libero2Number.Text, Libero2NumberOnCard.Text
   - Для GT Titles используется имя поля с суффиксом .Text

2. Поддержка команды SetTextColour в vMix API:
   - Добавлен метод setTextColour() в vmix-client.js
   - Команда вызывается после SetText для установки цвета уже установленного текста
   - Правильное кодирование цвета в URL (символ # кодируется как %23)
   - Поддержка всех полей номеров либеро

3. Тесты:
   - Добавлен файл tests/unit/main/vmix-client-text-color.test.js
   - Тесты проверяют формирование URL для команды SetTextColour
   - Тесты проверяют кодирование цвета и работу с разными цветами
   - Обновлены тесты useVMix-libero-background.test.js для проверки логики

4. Единообразные отступы в header:
   - Добавлены отступы слева и справа на всех страницах
   - Используется maxWidth: 1600px и margin: 0 auto для центрирования
   - Теперь все страницы имеют одинаковые отступы

Затронутые файлы:
- src/renderer/hooks/useVMix.js - добавлена обработка контрастного цвета для полей либеро
- src/main/vmix-client.js - добавлен метод setTextColour()
- src/main/main.js - обновлен IPC handler для поддержки textColorFields
- src/main/preload.js - обновлен для передачи textColorFields
- src/renderer/components/Layout.jsx - добавлены отступы в header
- tests/unit/main/vmix-client-text-color.test.js - новый файл с тестами
- tests/unit/renderer/useVMix-libero-background.test.js - обновлены тесты
- CHANGELOG.md - добавлено описание новых функций
```
