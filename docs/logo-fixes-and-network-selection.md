# Исправления передачи логотипов и выбор сетевого интерфейса

## Проблемы, которые были решены

### 1. Логотипы не передавались в vMix через API команды

**Проблема:** После изменений в системе хранения логотипов (переход на `logoPath` и `logoBase64` вместо `logo`) функции формирования данных для vMix проверяли только поле `logo`, которое могло отсутствовать в объекте команды.

**Решение:**
- Обновлена проверка наличия логотипов в `getLineupFieldValue()`, `getRosterFieldValue()` и `getStartingLineupFieldValue()`
- Теперь проверяются все возможные источники: `logo`, `logoPath`, `logoBase64`
- Это обеспечивает корректное формирование URL для логотипов во всех случаях

### 2. Неправильные пути для логотипов в функциях составов

**Проблема:** В функциях `getRosterFieldValue()` и `getStartingLineupFieldValue()` формировался двойной путь `/logos/logos/logo_a.png`, так как `logoBaseUrl` уже содержал `/logos`.

**Решение:**
- Исправлено формирование URL: `logoBaseUrl` всегда включает `/logos` (`http://[IP]:[PORT]/logos`)
- К нему добавляется только имя файла (`logo_a.png` или `logo_b.png`)
- Результат: `http://[IP]:[PORT]/logos/logo_a.png` (корректный путь)

### 3. Логотипы не сохранялись в файлы при обновлении матча

**Проблема:** Функция `processTeamLogoForSave()` проверяла только поле `logo` и не использовала `logoBase64`, поэтому при обновлении уже сохраненного матча логотипы не сохранялись в файлы.

**Решение:**
- Обновлена функция для проверки и `logo`, и `logoBase64`
- Логотипы теперь всегда сохраняются в файлы при обновлении матча, независимо от источника данных

### 4. Логотипы не работали в production сборке

**Проблема:** В production режиме папка `logos` находилась в `extraResources` (доступна только для чтения), что не позволяло сохранять и обновлять логотипы.

**Решение:**
- В production логотипы сохраняются в `userData/logos/` вместо `extraResources/logos/` (доступно для записи)
- Добавлена автоматическая миграция логотипов из `extraResources` в `userData` при первом запуске
- Сервер мобильного доступа обслуживает логотипы из `userData/logos/` в production режиме
- Пути определяются динамически через `app.getPath('userData')` в production

### 5. Проблема работы в разных подсетях

**Проблема:** Компьютер может иметь несколько сетевых адаптеров (физических и виртуальных), и мобильный сервер мог запуститься на IP из одной подсети, а vMix находится в другой.

**Решение:**
- Добавлен выбор сетевого интерфейса на странице "Мобильный доступ"
- Выпадающий список со всеми доступными интерфейсами (с IP адресами)
- Выбранный IP сохраняется в настройках (`mobile.selectedIP`)
- Мобильный сервер использует выбранный IP вместо автоматического определения
- При изменении интерфейса требуется перезапуск сервера для применения изменений

## Технические детали

### Изменения в `src/renderer/hooks/useVMix.js`

#### `getLineupFieldValue()`:
```javascript
// Было:
return logoBaseUrl && match.teamA?.logo ? `${logoBaseUrl}/logo_a.png` : "";

// Стало:
const hasLogoA = logoBaseUrl && (match.teamA?.logo || match.teamA?.logoPath || match.teamA?.logoBase64);
return hasLogoA ? `${logoBaseUrl}/logo_a.png` : "";
```

#### `getRosterFieldValue()` и `getStartingLineupFieldValue()`:
```javascript
// Было:
return logoBaseUrl && team?.logo ? `${logoBaseUrl}/logos/${logoFileName}` : "";

// Стало:
const hasLogo = logoBaseUrl && (team?.logo || team?.logoPath || team?.logoBase64);
return hasLogo ? `${logoBaseUrl}/${logoFileName}` : ""; // logoBaseUrl уже содержит /logos
```

#### Исправление `logoBaseUrl`:
- В `formatRosterData()`: `logoBaseUrl = http://${ip}:${port}/logos` (было без `/logos`)
- В `formatStartingLineupData()`: `logoBaseUrl = http://${ip}:${port}/logos` (было без `/logos`)
- В `formatLineupData()`: уже было правильно - `logoBaseUrl = http://${ip}:${port}/logos`

### Изменения в `src/main/logoManager.js`

#### `getLogosDir()`:
```javascript
// Было:
if (process.resourcesPath) {
  return path.join(process.resourcesPath, 'logos'); // read-only в production
}

// Стало:
if (isPackaged) {
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, 'logos'); // writable в production
}
```

#### `processTeamLogoForSave()`:
```javascript
// Теперь проверяет и logo, и logoBase64:
let logoBase64 = null;
if (team.logo) {
  logoBase64 = team.logo;
} else if (team.logoBase64) {
  logoBase64 = team.logoBase64;
}
```

#### Новые функции:
- `migrateLogosFromExtraResources()` - миграция логотипов из extraResources в userData при первом запуске
- `ensureLogosDir()` - теперь вызывает миграцию в production режиме

### Изменения в `src/main/server.js`

#### `getLogosPath()`:
```javascript
// Новая функция для определения пути к logos:
getLogosPath() {
  const isPackaged = app && app.isPackaged;
  if (isPackaged) {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'logos');
  }
  return path.join(__dirname, '../../logos');
}
```

#### `getNetworkInterfaces()`:
```javascript
// Новая функция для получения списка всех сетевых интерфейсов:
getNetworkInterfaces() {
  // Возвращает массив объектов:
  // { ip, name, interfaceName, isPrivate, isWireless, isVpn }
  // Сортировка по приоритету: частный IP + Wi-Fi, затем частный IP, затем публичный
}
```

#### `getLocalIP(selectedIP)`:
```javascript
// Обновлена функция для использования выбранного IP:
getLocalIP(selectedIP = null) {
  if (selectedIP) {
    // Проверяем доступность выбранного IP и возвращаем его
    const interfaces = this.getNetworkInterfaces();
    const found = interfaces.find(iface => iface.ip === selectedIP);
    if (found) return selectedIP;
  }
  // Иначе - автоматическое определение по приоритету
}
```

### Изменения в `src/main/main.js`

#### Новые IPC handlers:
- `mobile:get-network-interfaces` - получение списка сетевых интерфейсов
- `mobile:set-selected-ip` - сохранение выбранного IP адреса

#### Инициализация logos:
```javascript
// При старте приложения:
await logoManager.ensureLogosDir(); // Создает папку и выполняет миграцию
```

### Изменения в `src/main/settingsManager.js`

#### Настройки мобильного сервера:
```json
{
  "mobile": {
    "enabled": false,
    "port": 3000,
    "sessionId": null,
    "selectedIP": null  // Новое поле для выбранного IP
  }
}
```

### Изменения в `src/renderer/pages/MobileAccessPage.jsx`

#### Новые элементы интерфейса:
- Выпадающий список выбора сетевого интерфейса
- Отображение имени интерфейса, IP адреса и типа (VPN/публичный)
- Блокировка изменения при запущенном сервере
- Автоматический выбор первого доступного интерфейса при загрузке
- Сохранение выбора в настройки

## Миграция данных

### Миграция логотипов из extraResources в userData

При первом запуске приложения в production режиме:
1. Создается папка `userData/logos/` (если не существует)
2. Проверяется наличие файлов `logo_a.png` и `logo_b.png` в `userData/logos/`
3. Если файлы отсутствуют, копируются из `extraResources/logos/` (если доступны)
4. При последующих запусках миграция пропускается, если файлы уже существуют в `userData/logos/`

### Обратная совместимость

- Старые матчи с полем `logo` (base64) продолжают работать
- Старые матчи с полем `logoPath` продолжают работать
- При загрузке матча `logoPath` используется для определения пути к файлу
- При сохранении матча `logoBase64` всегда сохраняется для портативности

## Пути к файлам в разных режимах

### Dev режим:
- `logos/` - корень проекта (`__dirname/../../logos`)
- `matches/` - корень проекта (`__dirname/../../matches`)
- `settings.json` - корень проекта

### Production режим:
- `logos/` - `%APPDATA%/VolleyScore Master/logos/` (Windows) или `~/Library/Application Support/VolleyScore Master/logos/` (macOS)
- `matches/` - `process.resourcesPath/matches/` (extraResources, read-only для чтения существующих файлов)
- `settings.json` - `%APPDATA%/VolleyScore Master/settings.json` (userData, writable)

## Использование выбора сетевого интерфейса

1. Перейти на страницу "Мобильный доступ"
2. Выбрать нужный сетевой интерфейс из выпадающего списка (например, интерфейс в той же подсети, что и vMix - `192.168.144.x`)
3. Если сервер запущен, остановить его
4. Выбранный IP сохранится в настройках автоматически
5. Запустить сервер - он будет использовать выбранный IP
6. При следующем запуске будет использоваться сохраненный выбор

## Проверка работоспособности

После внесенных изменений логотипы должны:
1. ✅ Сохраняться в файлы при сохранении матча (dev и production)
2. ✅ Сохраняться в `userData/logos/` в production (доступно для записи)
3. ✅ Мигрировать из `extraResources` в `userData` при первом запуске в production
4. ✅ Передаваться в vMix через команду `SetImage` с правильными URL
5. ✅ Обслуживаться HTTP сервером из правильной папки (`userData/logos/` в production)
6. ✅ Использовать выбранный сетевой интерфейс для формирования URL
7. ✅ Работать в разных подсетях (сервер и vMix в разных подсетях)

## Отладка

### Проверка доступности логотипов:
- API endpoint: `GET /api/logos/check` - возвращает информацию о доступности файлов
- Консоль браузера: логирование полной строки HTTP запроса для команды `SetImage`
- Консоль Electron: логирование путей к папкам logos и процесса миграции

### Проверка выбранного IP:
- На странице "Мобильный доступ" отображается выбранный IP
- В настройках (`settings.json`) сохраняется `mobile.selectedIP`
- В консоли сервера логируется используемый IP при запуске

