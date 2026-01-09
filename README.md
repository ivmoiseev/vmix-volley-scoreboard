# VolleyScore Master

Приложение на Electron для управления счетом волейбольных матчей и интеграции с vMix.

## Требования

- Node.js 18+ 
- npm или yarn

## Установка

```bash
npm install
```

## Запуск в режиме разработки

```bash
npm run dev
```

Эта команда запустит:
- Vite dev server (на порту 5173, или на другом, если 5173 занят)
- Electron приложение (автоматически найдет правильный порт)

**Важно:** 
- Окно Electron появится автоматически после того, как Vite dev server будет готов
- Если порт 5173 занят, Vite автоматически переключится на другой порт (5174, 5175 и т.д.)
- Electron автоматически найдет правильный порт и подключится

## Другие команды

```bash
# Только Vite dev server (без Electron)
npm run vite

# Только Electron (требует собранного приложения)
npm run electron

# Сборка для production
npm run build

# Предпросмотр собранного приложения
npm run preview

# Сборка Electron приложения
npm run build:electron
```

## Сборка для production

### Подготовка

Убедитесь, что все зависимости установлены:
```bash
npm install
```

### Сборка приложения

Для сборки готового установочного пакета используйте:

```bash
npm run build:electron
```

Эта команда:
1. Собирает React приложение через Vite в папку `dist/`
2. Создает установочные пакеты через electron-builder в папку `release/`

### Результат сборки

После успешной сборки в папке `release/` будут созданы установочные пакеты:
- **Windows**: `VolleyScore Master Setup X.X.X.exe` (NSIS installer)
- **macOS**: `VolleyScore Master-X.X.X.dmg`
- **Linux**: `VolleyScore Master-X.X.X.AppImage`

### Дополнительные опции сборки

Сборка только для текущей платформы:
```bash
npm run build && electron-builder --dir
```

Сборка только для Windows:
```bash
npm run build && electron-builder --win
```

Сборка только для macOS:
```bash
npm run build && electron-builder --mac
```

Сборка только для Linux:
```bash
npm run build && electron-builder --linux
```

### Структура сборки

При сборке в пакет включаются:
- Собранное React приложение из `dist/`
- Файлы Main Process из `src/main/`
- Общие утилиты из `src/shared/`
- Все зависимости из `node_modules/`
- Папки `logos/` и `matches/` как дополнительные ресурсы

### Примечания

- При первой сборке electron-builder может скачать необходимые инструменты (может занять время)
- Для сборки на Windows для macOS потребуется macOS система (кросскомпиляция не поддерживается)
- Для подписи приложений настройте соответствующие сертификаты в конфигурации `build`

## Структура проекта

```
├── src/
│   ├── main/          # Electron main process
│   │   ├── settingsManager.js  # Менеджер глобальных настроек
│   │   ├── vmix-config.js      # Конфигурация vMix
│   │   ├── server.js           # HTTP сервер для мобильного доступа
│   │   └── ...
│   ├── renderer/      # React приложение
│   └── shared/        # Общие утилиты
├── docs/              # Документация
├── matches/           # Сохраненные матчи
├── logos/             # Логотипы команд (logo_a.png, logo_b.png)
├── settings.json      # Глобальные настройки приложения (не в git)
└── CHANGELOG.md       # История изменений
```

## Решение проблем

### Окно Electron не появляется

1. Убедитесь, что используется команда `npm run dev` (не `npm run vite`)
2. Проверьте, что порт 5173 не занят другим приложением
3. Проверьте консоль на наличие ошибок
4. Убедитесь, что все зависимости установлены: `npm install`

### Ошибки при запуске

- Проверьте версию Node.js: `node --version` (должна быть 18+)
- Удалите `node_modules` и `package-lock.json`, затем выполните `npm install` заново
- Проверьте логи в консоли

## Разработка

См. документацию в папке `docs/`:
- `app-description.md` - описание приложения и основных функций
- `ARCHITECTURE.md` - архитектура проекта, структура кода, потоки данных
- `ui-structure.md` - структура интерфейса и страниц приложения
- `vmix-api-reference.md` - справочник HTTP API vMix
- `vmix-settings-redesign-plan.md` - описание реализованной системы настроек vMix
- `TESTING.md` - руководство по тестированию
