# Инструкция по рефакторингу: авто-плашки событий vMix

*Дата: 2026-02-16*

Основа: разделы 3–4 документа [Автоматические плашки событий vMix](vmix-event-overlays.md). Цель — убрать дублирование, улучшить типизацию и читаемость без изменения поведения.

---

## Общие требования

- **Перед началом:** убедиться, что тесты проходят (`npm test`) и приложение вручную проверено (таймаут, сетбол, матчбол, скрытие при выключении счёта).
- **После каждого шага:** запускать `npm test` и при необходимости проверку в UI.
- **Откат:** все изменения в одном файле `src/renderer/hooks/useVMix.ts`, при проблемах можно откатить коммит или правки по шагам.

---

## Шаг 0. Подготовка

1. Создать ветку для рефакторинга (по желанию).
2. Открыть `src/renderer/hooks/useVMix.ts`.
3. Зафиксировать текущие номера строк (поиском) для двух мест с дублированием:
   - блок в `updateDynamicInputs`: расчёт `rules`, `setball`, `matchball`, `activeTypes`, `toShow`, `mainSlotEventType` (примерно строки 799–826);
   - блок в эффекте синхронизации авто-оверлеев: тот же расчёт плюс `eventSignature` (примерно 1395–1432).

Дальнейшие шаги выполняются по порядку.

---

## Шаг 1. Тип конфига для авто-событий

**Цель:** один тип для конфига vMix в части авто-оверлеев, чтобы не дублировать приведение типов в эффекте и в `updateDynamicInputs`.

1. В начале файла `useVMix.ts`, после импортов и констант (после `DEBOUNCE_DELAY = 300`), добавить блок с типами:

```ts
/** Конфиг инпута в части авто-событий (используется в эффекте синхронизации и updateDynamicInputs) */
interface VMixInputAutoEventConfig {
  overlay?: number;
  isScoreInput?: boolean;
  autoEvent?: boolean;
  autoEventTypes?: string[];
  autoEventShowAlongside?: boolean;
}

/** Фрагмент конфига vMix для расчёта авто-оверлеев */
interface VMixAutoEventConfig {
  inputOrder?: string[];
  inputs?: Record<string, VMixInputAutoEventConfig>;
  overlay?: number;
}
```

2. Сохранить файл, убедиться, что линтер не ругается.

---

## Шаг 2. Константы авто-оверлеев в один блок

**Цель:** все интервалы и задержки авто-оверлеев собрать в одном месте с комментариями.

1. В начале файла после констант `OVERLAY_UPDATE_DELAY`, `OVERLAY_POLL_INTERVAL`, `DEBOUNCE_DELAY` добавить блок:

```ts
// --- Авто-оверлеи (сетбол, матчбол, таймаут) ---
/** Минимальный интервал между проходами синхронизации show/hide (мс) */
const AUTO_SYNC_MIN_INTERVAL_MS = 2500;
/** После отправки hide не отправлять hide для того же ключа (мс), чтобы не сбивать анимацию в vMix */
const AUTO_HIDE_COOLDOWN_MS = 4000;
/** Минимальная пауза между hide и show для одного ключа (мс), чтобы анимация скрытия успела завершиться */
const MIN_MS_AFTER_HIDE_BEFORE_SHOW = 1500;
```

2. Удалить объявления этих трёх констант из тела хука (сейчас они объявлены рядом с ref-ами, примерно строки 82, 86, 88). Оставить в хуке только ref-ы и комментарии к ним.

3. Проверить: в коде хука везде используются имена `AUTO_SYNC_MIN_INTERVAL_MS`, `AUTO_HIDE_COOLDOWN_MS`, `MIN_MS_AFTER_HIDE_BEFORE_SHOW` без изменений. Запустить тесты.

---

## Шаг 3. Функция computeAutoEventState

**Цель:** вынести расчёт `activeTypes`, `toShow`, `mainSlotEventType`, `eventSignature` в одну функцию, чтобы не дублировать логику.

1. Определить сигнатуру и возвращаемый тип. Результат расчёта удобно описать интерфейсом:

```ts
/** Результат расчёта состояния авто-событий (сетбол/матчбол/таймаут) */
interface AutoEventState {
  activeTypes: string[];
  toShow: Set<string>;
  mainSlotEventType: string | null;
  eventSignature: string;
}
```

Эти типы можно добавить рядом с `VMixAutoEventConfig` (после шага 1).

2. Добавить функцию внутри файла `useVMix.ts`. Разместить её **внутри** функции `useVMix`, после всех `useRef` и перед первым `useCallback`, чтобы она могла использовать только аргументы и конфиг из ref (конфиг будем передавать параметром, чтобы не зависеть от замыкания в момент вызова).

Сигнатура:

```ts
function computeAutoEventState(
  matchData: Match | null,
  overlayOptions: UseVMixOverlayOptions | undefined,
  config: VMixAutoEventConfig | null
): AutoEventState | null
```

Логика функции (перенести из текущего кода):

- Если `!matchData || !config` — вернуть `null`.
- Взять из `config`: `inputOrder`, `inputs` (по умолчанию `{}`).
- Из `overlayOptions`: `timeoutTeam`, `isTimeoutActive`.
- Вычислить `rules = getRules(matchData as any)`, `cs = matchData.currentSet`.
- Вычислить `setball` и `matchball` так же, как сейчас в эффекте (через `rules.isSetball`, `rules.isMatchball`).
- Заполнить массив `activeTypes`: setballA/setballB, matchballA/matchballB, timeoutA/timeoutB по тем же условиям.
- Построить `toShow` и `mainSlotEventType`: цикл по `AUTO_EVENT_PRIORITY_ORDER`, для каждого типа из `activeTypes` найти `inputId` по `inputs[id]?.autoEventTypes`, учесть `autoEventShowAlongside` и «основной слот».
- Вычислить `eventSignature = \`${cs?.scoreA ?? ""}-${cs?.scoreB ?? ""}-${cs?.setNumber ?? ""}-${activeTypes.join(",")}\``.
- Вернуть `{ activeTypes, toShow, mainSlotEventType, eventSignature }`.

3. Важно: функция должна быть чистой — без вызовов ref, без побочных эффектов. Конфиг передаётся третьим аргументом. Тогда и эффект, и `updateDynamicInputs` будут вызывать её, передавая свой конфиг (из ref или из аргумента).

4. Реализовать тело функции, скопировав логику из эффекта (блок с `rules`, `setball`, `matchball`, `activeTypes`, цикл по `AUTO_EVENT_PRIORITY_ORDER`, `eventSignature`). Типы для `setball`/`matchball` оставить как в текущем коде (`rules.isSetball(...)` и т.д.). Сохранить, проверить линтер.

---

## Шаг 4. Использование computeAutoEventState в updateDynamicInputs

**Цель:** заменить дублированный расчёт в `updateDynamicInputs` на вызов `computeAutoEventState`.

1. Найти в `updateDynamicInputs` блок от получения конфига до конца построения `toShow` и `mainSlotEventType` (включая `rules`, `setball`, `matchball`, `activeTypes`, цикл по `AUTO_EVENT_PRIORITY_ORDER`).

2. Заменить этот блок на:
   - приведение конфига к типу `VMixAutoEventConfig` (одно объявление переменной);
   - вызов `const state = computeAutoEventState(matchData, overlayOptionsRef.current, config);`;
   - проверку `if (!state) return;`;
   - использование `state.activeTypes`, `state.toShow`, `state.mainSlotEventType` в оставшемся цикле по `inputOrder`.

3. В цикле по `inputId` оставить логику:
   - `isAuto && !state.toShow.has(inputId)` → `continue`;
   - вычисление `eventType` через `state.mainSlotEventType` и `state.activeTypes`;
   - вызов `updateSingleDynamicInput(..., eventType ? { eventType } : undefined)`.

4. Убедиться, что `opts`/`overlayOptionsRef.current` передаются в `computeAutoEventState` (второй аргумент). Сохранить, запустить тесты.

---

## Шаг 5. Использование computeAutoEventState в эффекте синхронизации

**Цель:** убрать дублированный расчёт из эффекта и использовать общую функцию.

1. В эффекте синхронизации авто-оверлеев найти блок от `const opts = overlayOptionsRef.current` до `const eventSignature = ...` включительно (включая обновление `lastTimeoutStateRef`, формирование `matchData`, расчёт `rules`, `setball`, `matchball`, `activeTypes`, `toShow`, `mainSlotEventType`, `eventSignature` и обновление `lastEventSignatureRef`/`autoSyncLastRunRef`).

2. Оставить в эффекте:
   - проверки в начале (`!connectionStatus.connected` и т.д.);
   - получение `config` из `vmixConfigRef.current` с приведением к `VMixAutoEventConfig`;
   - `inputOrder`, `inputs`, `defaultOverlay`, `scoreInputKey`, `scoreOverlay`, `scoreActive`, `autoKeys`, `getOverlay`;
   - ветку `if (!scoreActive)` с hide авто-инпутов (без изменений);
   - обновление `lastTimeoutStateRef` и формирование `matchData` (как сейчас);
   - вызов состояния:  
     `const state = computeAutoEventState(_match, overlayOptionsRef.current, config);`  
     и проверку `if (!state) return;`
   - обновление троттлинга по подписи:  
     `if (lastEventSignatureRef.current !== state.eventSignature) { autoSyncLastRunRef.current = 0; lastEventSignatureRef.current = state.eventSignature; }`
   - дальше использовать `state.toShow`, `state.mainSlotEventType`, `state.activeTypes` везде, где сейчас используются локальные `toShow`, `mainSlotEventType`, `activeTypes`.

3. Построение `overlaysWithAutoToShow` оставить, но использовать `state.toShow`:  
   `const overlaysWithAutoToShow = new Set([...state.toShow].map((k) => getOverlay(k)).filter(...));`

4. В async IIFE в цикле по `autoKeys` заменить обращения к `toShow`, `mainSlotEventType`, `activeTypes` на `state.toShow`, `state.mainSlotEventType`, `state.activeTypes`. Для `matchData` по-прежнему использовать локальную переменную `matchData`, сформированную до вызова `computeAutoEventState`.

5. Удалить из эффекта объявления `rules`, `cs`, `setball`, `matchball`, `activeTypes`, цикл по `AUTO_EVENT_PRIORITY_ORDER`, локальные `toShow` и `mainSlotEventType`, а также старую строку с `eventSignature`. Сохранить, запустить тесты и проверить сценарии (сетбол, матчбол, таймаут, выключение счёта).

---

## Шаг 6. (Опционально) Вынос тела эффекта в runAutoOverlaySync

**Цель:** уменьшить размер эффекта и упростить чтение.

1. Внутри `useVMix` после определения `computeAutoEventState` (или рядом с ним) объявить функцию вида:

```ts
async function runAutoOverlaySync(): Promise<void> {
  // сюда перенести всё содержимое текущего async IIFE из useEffect
  // (проверки autoSyncInProgressRef, интервал, цикл по autoKeys, show/hide, finally)
}
```

2. Параметры: все данные, которые сейчас берутся из замыкания эффекта (`config`, `inputOrder`, `inputs`, `scoreInputKey`, `scoreOverlay`, `autoKeys`, `getOverlay`, `state`, `overlaysWithAutoToShow`, `matchData`, `isOverlayActive`, `showOverlay`, `updateSingleDynamicInput`), передавать в `runAutoOverlaySync` аргументами одним объектом, например `runAutoOverlaySync({ config, scoreInputKey, scoreOverlay, autoKeys, getOverlay, state, matchData, ... })`.

3. В эффекте оставить только: проверки, получение конфига, вызов `computeAutoEventState`, обновление ref по eventSignature, формирование `overlaysWithAutoToShow` и один вызов `runAutoOverlaySync(...)` (без оборачивания в `(async () => { ... })()`; можно просто `void runAutoOverlaySync(...)`).

4. Проверить, что зависимости эффекта не изменились и что поведение совпадает с предыдущей версией. Запустить тесты.

---

## Шаг 7. (Опционально) Логирование ошибок hide/show в dev

**Цель:** не глотать ошибки при отладке.

1. Найти все места, где вызывается `hideVMixOverlay` или показ оверлея с `.catch(() => {})`.

2. Заменить на условное логирование, например:

```ts
.catch((err) => {
  if (process.env.NODE_ENV !== "production") {
    console.warn("[useVMix] hide overlay failed", key, err);
  }
})
```

(для hide; для show — по аналогии, с подходящим сообщением и ключом).

3. Убедиться, что в production ошибка по-прежнему не пробрасывается и консоль не засоряется. Запустить тесты.

---

## Шаг 8. (Опционально) Логирование vMix API в production

**Цель:** при необходимости отключать или сокращать логи команд vMix в production.

1. В `src/main/vmix-client.ts` в методе `sendCommand` перед текущим `console.log` добавить проверку, например:

```ts
const logVMixCommands = process.env.NODE_ENV !== "production" || process.env.VMIX_LOG_API === "1";
if (logVMixCommands) {
  console.log(`[vMix API] ${functionName} ...`);
}
```

2. Документировать в README или в документации по сборке: в production по умолчанию логи vMix API отключены; для отладки можно включить через переменную окружения `VMIX_LOG_API=1`. Детали реализации (имя переменной, способ передачи в Electron) согласовать с проектом.

---

## Шаг 9. Отключение ручного нажатия для авто-инпутов в «Управление плашками vMix»

**Цель:** сделать кнопки авто-инпутов (сетбол/матчбол/таймаут) недоступными для ручного нажатия. Ручное управление для них не предусмотрено и может приводить к некорректному поведению.

### Анализ

- **Где:** блок «Управление плашками vMix» на странице управления матчем — компонент `VMixOverlayButtons` (`src/renderer/components/VMixOverlayButtons.tsx`). Список кнопок строится по `vmixConfig.inputOrder`; у каждого инпута в конфиге может быть `autoEvent === true`.
- **Текущее поведение:** для авто-инпутов отображается подпись «(авт.)» и тултип «Автоматический показ при событиях…», но кнопка остаётся активной: пользователь может вручную нажать «Показать» или «Скрыть».
- **Почему ручные нажатия плохи:**
  - Показ/скрытие авто-инпутов управляется эффектом синхронизации в useVMix по состоянию матча (сетбол/матчбол/таймаут) и оверлея со счётом. Ручной показ может конфликтовать с логикой авто-синхронизации (например, пользователь показал плашку вручную, через 2–3 с эффект решит, что по текущему состоянию её не должно быть, и отправит hide).
  - Ручное скрытие во время активного события (например, таймаут) будет сразу перезаписано следующим проходом эффекта — плашка снова появится, что выглядит как «глюк».
  - Единый источник истины для авто-плашек — состояние матча и таймаута; ручные действия этот источник обходят и создают рассинхрон.
- **Вывод:** для инпутов с `autoEvent === true` кнопки «Показать»/«Скрыть» в блоке «Управление плашками vMix» лучше сделать всегда недоступными (disabled), с понятным тултипом.

### Инструкция

1. Открыть `src/renderer/components/VMixOverlayButtons.tsx`.

2. В блоке, где формируется `disabled` для кнопки (сейчас примерно строки 105–108), добавить условие «авто-инпут всегда недоступен»:
   - Было: `const disabled = !isVMixConnected || !isInputEnabled || (anotherOnAir && !active);`
   - Стало: `const disabled = !isVMixConnected || !isInputEnabled || (anotherOnAir && !active) || btn.autoEvent;`
   - То есть при `btn.autoEvent === true` кнопка всегда disabled, независимо от подключения и других флагов.

3. Обновить формирование `tooltipText`, чтобы для авто-инпутов показывать отдельное пояснение:
   - Если `btn.autoEvent === true`, задать тултип, например: `"Показ и скрытие управляются автоматически (сетбол, матчбол, таймаут)"`.
   - Иначе оставить текущую логику (vMix не подключен / инпут отключен / другая плашка в эфире / Скрыть плашку / Показать плашку).

   Пример варианта:

   ```ts
   const tooltipText = btn.autoEvent
     ? 'Показ и скрытие управляются автоматически (сетбол, матчбол, таймаут)'
     : disabled
       ? !isVMixConnected
         ? 'vMix не подключен'
         : !isInputEnabled
           ? 'Инпут отключен в настройках'
           : 'Другая плашка этого инпута в эфире'
       : active
         ? 'Скрыть плашку'
         : 'Показать плашку';
   ```

4. По желанию можно слегка изменить отображение отключённой авто-кнопки (например, `opacity` или стиль), чтобы визуально было видно, что это «информационная» кнопка, а не временно недоступная. Не обязательно: `disabled` и тултип уже дают понятное поведение.

5. Сохранить файл, запустить тесты (`npm test`). При наличии тестов для VMixOverlayButtons — проверить, что для авто-инпута кнопка рендерится с `disabled={true}` и нужным `title`; при необходимости обновить или добавить тест.

6. Ручная проверка: на странице управления матчем в блоке «Управление плашками vMix» кнопки инпутов с пометкой «(авт.)» не нажимаются, при наведении отображается тултип про автоматическое управление.

---

## Проверка после рефакторинга

- [ ] `npm test` — все тесты зелёные.
- [ ] Ручная проверка: новый матч, счёт, сетбол появляется и исчезает без лишних команд и без пустого текста.
- [ ] Таймаут А/Б — показ и скрытие плашки с текстом «Таймаут», без затирания.
- [ ] Выключение счёта — авто-инпуты скрываются.
- [ ] В консоли нет лишних повторяющихся команд OverlayInput*Out при пустом оверлее.
- [ ] Линтер без ошибок в `useVMix.ts`.
- [ ] (Шаг 9) В блоке «Управление плашками vMix» кнопки авто-инпутов («(авт.)») недоступны для нажатия, тултип объясняет автоматическое управление.

---

## Краткая сводка изменений по файлам

| Файл | Изменения |
|------|-----------|
| `src/renderer/hooks/useVMix.ts` | Типы VMixAutoEventConfig, VMixInputAutoEventConfig, AutoEventState; константы авто-оверлеев в один блок; функция computeAutoEventState; замена дублирования в updateDynamicInputs и в эффекте на вызов computeAutoEventState; опционально runAutoOverlaySync и dev-логирование в .catch. |
| `src/renderer/components/VMixOverlayButtons.tsx` | Шаг 9: для инпутов с `autoEvent === true` кнопка всегда disabled, тултип «Показ и скрытие управляются автоматически…». |
| `src/main/vmix-client.ts` | Опционально: условное логирование команд по NODE_ENV / VMIX_LOG_API. |

После выполнения обязательных шагов (1–5) дублирование устранено, типы и константы приведены в порядок. Шаг 9 рекомендуется выполнить отдельно (UX: авто-инпуты не нажимаются вручную). Шаги 6–8 — по желанию для дальнейшего улучшения читаемости и отладки.
