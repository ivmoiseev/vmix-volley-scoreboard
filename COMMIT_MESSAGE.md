refactor: очистка структуры проекта и удаление устаревших зависимостей

Удаление Jest:
- Удалены все зависимости Jest (jest, jest-environment-jsdom, jest-junit, babel-jest, ts-jest, @types/jest)
- Удален файл jest.config.js
- Проект полностью использует Vitest для тестирования
- Обновлены комментарии в vite.config.js и tests/setup.js

Удаление дублирующихся корневых папок:
- Удалена папка services/ (дубликат src/shared/services/)
- Удалена папка domain/ (дубликат src/shared/domain/)
- Удалена папка main/ (дубликат src/main/)
- Удалена папка shared/ (дубликат src/shared/)
- Удалена папка types/ (дубликат src/shared/types/)
- Удалена папка validators/ (дубликат src/shared/validators/)
- Все импорты проверены и указывают на src/shared/

Упрощение структуры сборки:
- Удалена папка build/ (заменена на использование assets/)
- buildResources теперь указывает на assets/ вместо build/
- Обновлены пути к иконкам в конфигурации electron-builder
- Упрощен скрипт prepare-icons.js (убрано копирование в build/)

Результат:
- Упрощена структура проекта
- Убрано дублирование файлов и папок
- Уменьшен размер проекта (удалены неиспользуемые зависимости)
- Улучшена поддерживаемость кода

Технические детали:
- Удалены файлы: jest.config.js, build/icon.ico, все файлы из корневых папок
- Обновлены: package.json, scripts/prepare-icons.js, vite.config.js, tests/setup.js
- Добавлена документация: docs/development/project-structure-cleanup.md
