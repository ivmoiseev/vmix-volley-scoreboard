# План рефакторинга: Управление счетом и состояниями партий

**Дата создания:** 2025-01-XX  
**Статус:** План рефакторинга  
**Цель:** Создание четкой, понятной, простой и функциональной системы, готовой к масштабированию

---

## Оглавление

1. [Анализ проблемных мест](#анализ-проблемных-мест)
2. [Архитектурные принципы рефакторинга](#архитектурные-принципы-рефакторинга)
3. [Новая архитектура](#новая-архитектура)
4. [План миграции на TypeScript](#план-миграции-на-typescript)
5. [План разделения ответственности](#план-разделения-ответственности)
6. [План тестирования](#план-тестирования)
7. [План документирования](#план-документирования)
8. [Этапы реализации](#этапы-реализации)
9. [Критерии успеха](#критерии-успеха)
10. [Учет мобильного интерфейса](#учет-мобильного-интерфейса)

---

## Анализ проблемных мест

### 1. Сложная логика определения текущей партии

**Проблема:**
- Проверка `isCurrentSet` требует проверки и `setNumber`, и `status`
- Логика разбросана по разным местам
- Легко ошибиться при определении, какая партия редактируется

**Текущий код:**
```javascript
const isCurrentSet = setNumber === prevMatch.currentSet.setNumber && 
                     prevMatch.currentSet.status === SET_STATUS.IN_PROGRESS;
```

**Проблемы:**
- Дублирование логики в `useMatch.js` и `SetEditModal.jsx`
- Неочевидная логика (нужно помнить про проверку статуса)
- Отсутствие единой точки истины

**Влияние:**
- Высокий риск ошибок
- Сложность поддержки
- Невозможность переиспользования

---

### 2. Дублирование логики обработки времени

**Проблема:**
- Логика удаления времени при изменении статуса дублируется в:
  - `useMatch.updateSet()`
  - `SetEditModal.handleChange()`
  - `SetEditModal.handleSave()`

**Текущий код (дублируется в 3 местах):**
```javascript
if (updates.status === SET_STATUS.PENDING) {
  updatedSet.startTime = null;
  updatedSet.endTime = null;
  updatedSet.duration = undefined;
} else if (updates.status === SET_STATUS.IN_PROGRESS) {
  updatedSet.endTime = null;
  updatedSet.duration = undefined;
}
```

**Проблемы:**
- Нарушение DRY принципа
- Риск рассинхронизации логики
- Сложность изменений (нужно менять в 3 местах)

**Влияние:**
- Высокий риск багов
- Сложность поддержки
- Невозможность централизованной валидации

---

### 3. Сложная логика определения номера следующей партии

**Проблема:**
- Множественные условия для определения номера
- Неочевидная логика приоритетов
- Сложность тестирования

**Текущий код:**
```javascript
let nextSetNumber;
if (prevMatch.sets.length > 0) {
  const maxSetNumberInSets = Math.max(...prevMatch.sets.map(s => s.setNumber));
  nextSetNumber = maxSetNumberInSets + 1;
} else {
  if (prevMatch.currentSet.setNumber && prevMatch.currentSet.status === SET_STATUS.PENDING) {
    nextSetNumber = prevMatch.currentSet.setNumber;
  } else {
    nextSetNumber = 1;
  }
}
```

**Проблемы:**
- Сложная вложенность условий
- Неочевидная логика приоритетов
- Отсутствие явных правил

**Влияние:**
- Высокий риск ошибок
- Сложность понимания
- Невозможность переиспользования

---

### 4. Защита `currentSet` при редактировании завершенной партии

**Проблема:**
- Сложная логика с множественными проверками
- Неочевидные условия
- Высокий риск ошибок

**Текущий код:**
```javascript
const isActuallyCurrentSet = prevMatch.currentSet.setNumber === setNumber && 
                             prevMatch.currentSet.status === SET_STATUS.IN_PROGRESS;

if (!isActuallyCurrentSet) {
  if (prevMatch.currentSet.status === SET_STATUS.IN_PROGRESS) {
    newMatch.currentSet = { ...prevMatch.currentSet };
  } else if (prevMatch.currentSet.status !== SET_STATUS.PENDING) {
    newMatch.currentSet = {
      ...prevMatch.currentSet,
      status: SET_STATUS.PENDING,
      scoreA: prevMatch.currentSet.scoreA,
      scoreB: prevMatch.currentSet.scoreB,
    };
  } else {
    newMatch.currentSet = { 
      ...prevMatch.currentSet,
      scoreA: prevMatch.currentSet.scoreA,
      scoreB: prevMatch.currentSet.scoreB,
    };
  }
}
```

**Проблемы:**
- Сложная вложенность условий
- Дублирование кода (scoreA, scoreB)
- Неочевидная логика

**Влияние:**
- Высокий риск ошибок
- Сложность понимания
- Невозможность переиспользования

---

### 5. Множественные проверки завершенности партии

**Проблема:**
- Проверки `completed`, `status`, наличия времени дублируются в разных местах:
  - `SetEditModal.determineSetStatus()`
  - `SetEditModal.getIsCompletedSet()`
  - `useMatch.updateSet()`
  - `volleyballRules.isMatchball()`

**Текущий код (дублируется в 4+ местах):**
```javascript
const isCompleted = set.completed === true || 
                   set.status === SET_STATUS.COMPLETED || 
                   (set.startTime && set.endTime);
```

**Проблемы:**
- Нарушение DRY принципа
- Риск рассинхронизации логики
- Разные приоритеты проверок в разных местах

**Влияние:**
- Высокий риск багов
- Сложность поддержки
- Невозможность централизованной валидации

---

### 6. Логика определения доступных опций статуса

**Проблема:**
- Сложная логика в `SetEditModal.getStatusOptions()`
- Множественные зависимости
- Сложность тестирования

**Текущий код:**
```javascript
const getStatusOptions = () => {
  if (isCurrentSet && formData.status === SET_STATUS.IN_PROGRESS) {
    return [IN_PROGRESS, PENDING];
  }
  
  const isCompletedSet = getIsCompletedSet();
  const subsequentSetStarted = isAnySubsequentSetStarted();
  
  if (isCompletedSet) {
    if (!subsequentSetStarted) {
      return [COMPLETED, IN_PROGRESS];
    } else {
      return [COMPLETED];
    }
  }
  
  return [PENDING, IN_PROGRESS, COMPLETED];
};
```

**Проблемы:**
- Сложная вложенность условий
- Множественные зависимости
- Отсутствие явных правил

**Влияние:**
- Высокий риск ошибок
- Сложность понимания
- Невозможность переиспользования

---

### 7. История действий хранит полные копии `match`

**Проблема:**
- Может занимать много памяти при длительных матчах
- Каждое действие сохраняет полную копию состояния

**Текущий код:**
```javascript
addToHistory({
  type: 'score_change',
  previousState: { ...prevMatch },  // Полная копия
});
```

**Проблемы:**
- Высокое потребление памяти
- Медленная сериализация/десериализация
- Невозможность оптимизации

**Влияние:**
- Производительность
- Масштабируемость
- Пользовательский опыт

---

### 8. Отмена действия работает только для последнего действия

**Проблема:**
- Нет возможности отменить несколько действий
- Нет возможности повторить отмененное действие

**Текущий код:**
```javascript
const undoLastAction = useCallback(() => {
  const lastAction = actionHistory[actionHistory.length - 1];
  setMatch(lastAction.previousState);
  setActionHistory(prev => prev.slice(0, -1));
}, [actionHistory]);
```

**Проблемы:**
- Ограниченная функциональность
- Невозможность навигации по истории
- Плохой UX

**Влияние:**
- Функциональность
- Пользовательский опыт
- Конкурентное преимущество

---

### 9. Отсутствие типизации

**Проблема:**
- JavaScript без строгой типизации
- Отсутствие проверки типов на этапе разработки
- Высокий риск ошибок типов

**Текущее состояние:**
- TypeScript типы определены в `Match.ts`, но не используются везде
- Много `any` типов
- Отсутствие строгой проверки

**Влияние:**
- Высокий риск ошибок
- Сложность рефакторинга
- Плохая поддержка IDE

---

### 10. Отсутствие тестов

**Проблема:**
- Критическая логика не покрыта тестами
- Невозможность безопасного рефакторинга
- Высокий риск регрессий

**Текущее состояние:**
- Есть базовые тесты для некоторых модулей
- Нет тестов для логики управления партиями
- Нет интеграционных тестов

**Влияние:**
- Высокий риск багов
- Невозможность безопасного рефакторинга
- Сложность поддержки

---

### 11. Дублирование логики в мобильном сервере

**Проблема:**
- Мобильный сервер (`server.js`) дублирует всю логику из `useMatch.js`:
  - Обновление счета (строки 207-220)
  - Начало партии (строки 237-275)
  - Завершение партии (строки 277-341)
  - Изменение подачи (строки 343-373)
  - Отмена действия (строки 375-433)

**Текущий код:**
```javascript
// Мобильный сервер напрямую мутирует match
this.currentMatch.currentSet.scoreA = Math.max(0, 
  this.currentMatch.currentSet.scoreA + (delta || 0));
```

**Проблемы:**
- Нарушение DRY принципа
- Прямая мутация объекта (нарушение immutability)
- Нет валидации (кроме базовой проверки)
- Упрощенная логика определения номера партии (`sets.length + 1`)
- Нет истории действий (undo работает через передачу `previousState` из клиента)
- Риск рассинхронизации логики

**Влияние:**
- Высокий риск багов
- Сложность поддержки (нужно менять в 2 местах)
- Невозможность переиспользования
- Проблемы с синхронизацией состояния

---

### 12. Отсутствие синхронизации истории действий

**Проблема:**
- История действий хранится только в `useMatch` хуке
- Мобильный интерфейс не имеет доступа к истории
- Отмена действия в мобильном интерфейсе работает через передачу `previousState` из клиента

**Текущий код:**
```javascript
// Мобильный сервер получает previousState из клиента
this.app.post('/api/match/:sessionId/undo', (req, res) => {
  const { previousState } = req.body;
  this.currentMatch = previousState; // Прямая замена
});
```

**Проблемы:**
- Клиент должен хранить историю
- Нет единой точки истины для истории
- Риск рассинхронизации
- Невозможность отмены действий из основного приложения в мобильном

**Влияние:**
- Плохой UX
- Сложность поддержки
- Риск багов

---

## Архитектурные принципы рефакторинга

### 1. Разделение ответственности (Separation of Concerns)

**Принцип:**
- Каждый модуль отвечает за одну задачу
- Четкие границы между слоями
- Минимальные зависимости

**Применение:**
- Выделение слоя бизнес-логики
- Выделение слоя состояния
- Выделение слоя представления

### 2. Единая точка истины (Single Source of Truth)

**Принцип:**
- Каждое правило определено в одном месте
- Нет дублирования логики
- Централизованная валидация

**Применение:**
- Единые функции для проверки состояний
- Единые функции для обработки времени
- Единые функции для валидации

### 3. Неизменяемость (Immutability)

**Принцип:**
- Все изменения создают новые объекты
- Нет мутаций существующих данных
- Предсказуемое поведение

**Применение:**
- Использование spread операторов
- Функции создания новых объектов
- Защита от случайных мутаций

### 4. Композиция над наследованием

**Принцип:**
- Использование композиции функций
- Переиспользование через композицию
- Гибкость архитектуры

**Применение:**
- Мелкие переиспользуемые функции
- Композиция функций для сложной логики
- Функциональный подход

### 5. Тестируемость

**Принцип:**
- Все функции легко тестируются
- Минимум зависимостей
- Чистые функции где возможно

**Применение:**
- Выделение чистых функций
- Минимизация побочных эффектов
- Изоляция тестов

---

## Новая архитектура

### Структура модулей

```
src/
├── shared/
│   ├── types/
│   │   └── Match.ts                    # TypeScript типы (расширенные)
│   ├── domain/
│   │   ├── SetDomain.ts                # Бизнес-логика партий (TypeScript)
│   │   ├── MatchDomain.ts              # Бизнес-логика матча (TypeScript)
│   │   └── SetStateMachine.ts          # Машина состояний партий (TypeScript)
│   ├── services/
│   │   ├── SetService.ts               # Сервис работы с партиями (TypeScript)
│   │   ├── ScoreService.ts             # Сервис работы со счетом (TypeScript)
│   │   └── HistoryService.ts           # Сервис истории действий (TypeScript)
│   ├── validators/
│   │   ├── SetValidator.ts             # Валидация партий (TypeScript)
│   │   └── TimeValidator.ts           # Валидация времени (TypeScript)
│   └── utils/
│       ├── setUtils.ts                 # Утилиты для партий (TypeScript)
│       ├── timeUtils.ts                # Утилиты времени (TypeScript)
│       └── matchUtils.ts               # Утилиты матча (TypeScript)
├── main/
│   ├── server/
│   │   ├── MobileServer.ts             # Мобильный HTTP сервер (TypeScript)
│   │   └── api/
│   │       ├── MatchApiController.ts    # API контроллер для матча (TypeScript)
│   │       └── MatchApiRoutes.ts       # API маршруты (TypeScript)
│   └── ...
├── renderer/
│   ├── hooks/
│   │   ├── useMatch.ts                 # Хук управления матчем (TypeScript)
│   │   └── useMatchHistory.ts          # Хук истории действий (TypeScript)
│   ├── components/
│   │   ├── SetEditModal.tsx            # Модальное окно (TypeScript)
│   │   └── SetsDisplay.tsx             # Отображение партий (TypeScript)
│   └── pages/
│       └── MatchControlPage.tsx        # Страница управления (TypeScript)
└── tests/
    ├── unit/
    │   ├── domain/
    │   │   ├── SetDomain.test.ts
    │   │   ├── MatchDomain.test.ts
    │   │   └── SetStateMachine.test.ts
    │   ├── services/
    │   │   ├── SetService.test.ts
    │   │   ├── ScoreService.test.ts
    │   │   └── HistoryService.test.ts
    │   ├── validators/
    │   │   ├── SetValidator.test.ts
    │   │   └── TimeValidator.test.ts
    │   └── api/
    │       └── MatchApiController.test.ts
    └── integration/
        ├── match-flow.test.ts
        └── mobile-api.test.ts
```

### Слои архитектуры

#### 1. Domain Layer (Бизнес-логика)

**Назначение:** Чистая бизнес-логика без зависимостей от UI

**Модули:**
- `SetDomain.ts` - логика работы с партиями
- `MatchDomain.ts` - логика работы с матчем
- `SetStateMachine.ts` - машина состояний партий

**Принципы:**
- Чистые функции (pure functions)
- Нет зависимостей от React/UI
- Легко тестируется
- TypeScript с строгой типизацией

#### 2. Service Layer (Сервисы)

**Назначение:** Оркестрация бизнес-логики, управление состоянием

**Модули:**
- `SetService.ts` - сервис работы с партиями
- `ScoreService.ts` - сервис работы со счетом
- `HistoryService.ts` - сервис истории действий

**Принципы:**
- Использует Domain Layer
- Управляет транзакциями
- Обрабатывает побочные эффекты
- TypeScript с строгой типизацией

#### 3. Validator Layer (Валидация)

**Назначение:** Валидация данных и бизнес-правил

**Модули:**
- `SetValidator.ts` - валидация партий
- `TimeValidator.ts` - валидация времени

**Принципы:**
- Чистые функции валидации
- Возвращают структурированные ошибки
- Легко тестируется
- TypeScript с строгой типизацией

#### 4. API Layer (HTTP API для мобильного интерфейса)

**Назначение:** HTTP endpoints для мобильного интерфейса

**Модули:**
- `MatchApiController.ts` - контроллер API
- `MatchApiRoutes.ts` - маршруты API
- `MobileServer.ts` - HTTP сервер

**Принципы:**
- Использует Service Layer (НЕ дублирует логику)
- Валидация входных данных
- Обработка ошибок
- TypeScript с строгой типизацией

#### 5. UI Layer (Представление)

**Назначение:** React компоненты и хуки

**Модули:**
- `useMatch.ts` - хук управления матчем
- `useMatchHistory.ts` - хук истории
- Компоненты React

**Принципы:**
- Использует Service Layer
- Минимум бизнес-логики
- Только представление и взаимодействие
- TypeScript с строгой типизацией

---

## План миграции на TypeScript

### Этап 1: Подготовка инфраструктуры

**Задачи:**
1. Настройка TypeScript конфигурации
2. Настройка ESLint для TypeScript
3. Настройка тестов для TypeScript
4. Обновление build конфигурации

**Файлы:**
- `tsconfig.json` - расширенная конфигурация
- `.eslintrc.js` - правила для TypeScript
- `jest.config.js` - поддержка TypeScript в тестах

**Критерии готовности:**
- TypeScript компилируется без ошибок
- ESLint проходит проверку
- Тесты запускаются

### Этап 2: Миграция типов

**Задачи:**
1. Расширение типов в `Match.ts`
2. Добавление строгих типов для всех функций
3. Удаление `any` типов
4. Добавление generic типов где необходимо

**Файлы:**
- `src/shared/types/Match.ts` - расширенные типы

**Новые типы:**
```typescript
// Типы для обновлений
export interface SetUpdates {
  scoreA?: number;
  scoreB?: number;
  status?: SetStatus;
  startTime?: number | null;
  endTime?: number | null;
}

// Типы для валидации
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Типы для истории
export interface ActionHistoryItem {
  type: ActionType;
  timestamp: number;
  previousState: Match;
  changes?: Record<string, unknown>;
}

export type ActionType = 
  | 'score_change'
  | 'serve_change'
  | 'set_start'
  | 'set_finish'
  | 'set_update'
  | 'set_resume';
```

### Этап 3: Миграция Domain Layer

**Задачи:**
1. Создание `SetDomain.ts` с чистой бизнес-логикой
2. Создание `MatchDomain.ts` с логикой матча
3. Создание `SetStateMachine.ts` с машиной состояний
4. Миграция функций из `volleyballRules.js`

**Файлы:**
- `src/shared/domain/SetDomain.ts`
- `src/shared/domain/MatchDomain.ts`
- `src/shared/domain/SetStateMachine.ts`

**Пример структуры:**
```typescript
// SetDomain.ts
export class SetDomain {
  static isCurrentSet(setNumber: number, match: Match): boolean;
  static isCompleted(set: Set | CurrentSet): boolean;
  static calculateNextSetNumber(match: Match): number;
  static processTimeForStatus(status: SetStatus, updates: SetUpdates): SetUpdates;
  static protectCurrentSet(match: Match, setNumber: number): CurrentSet;
}

// SetStateMachine.ts
export class SetStateMachine {
  static canTransition(from: SetStatus, to: SetStatus, context: TransitionContext): boolean;
  static getAvailableTransitions(current: SetStatus, context: TransitionContext): SetStatus[];
  static validateTransition(from: SetStatus, to: SetStatus, set: Set | CurrentSet, match: Match): ValidationResult;
}
```

### Этап 4: Миграция Service Layer

**Задачи:**
1. Создание `SetService.ts`
2. Создание `ScoreService.ts`
3. Создание `HistoryService.ts`
4. Миграция логики из `useMatch.js`

**Файлы:**
- `src/shared/services/SetService.ts`
- `src/shared/services/ScoreService.ts`
- `src/shared/services/HistoryService.ts`

**Пример структуры:**
```typescript
// SetService.ts
export class SetService {
  static startSet(match: Match): Match;
  static finishSet(match: Match): Match;
  static updateSet(match: Match, setNumber: number, updates: SetUpdates): Match;
  static resumeSet(match: Match, setNumber: number): Match;
}

// ScoreService.ts
export class ScoreService {
  static changeScore(match: Match, team: 'A' | 'B', delta: number): Match;
  static changeServingTeam(match: Match, team: 'A' | 'B'): Match;
}
```

### Этап 5: Миграция UI Layer

**Задачи:**
1. Миграция `useMatch.js` → `useMatch.ts`
2. Миграция компонентов на TypeScript
3. Добавление типов для пропсов
4. Удаление всех `any` типов

**Файлы:**
- `src/renderer/hooks/useMatch.ts`
- `src/renderer/components/SetEditModal.tsx` (уже .tsx, но добавить типы)
- `src/renderer/pages/MatchControlPage.tsx` (уже .tsx, но добавить типы)

---

## План разделения ответственности

### 1. Domain Layer: Чистая бизнес-логика

#### `SetDomain.ts` - Логика партий

**Ответственность:**
- Определение текущей партии
- Определение завершенности партии
- Вычисление номера следующей партии
- Обработка времени в зависимости от статуса
- Защита `currentSet` при редактировании

**Функции:**
```typescript
/**
 * Определяет, является ли партия с указанным номером текущей
 * @param setNumber - Номер партии для проверки
 * @param match - Объект матча
 * @returns true, если партия является текущей (IN_PROGRESS)
 */
static isCurrentSet(setNumber: number, match: Match): boolean;

/**
 * Определяет, является ли партия завершенной
 * @param set - Партия для проверки (Set или CurrentSet)
 * @returns true, если партия завершена
 */
static isCompleted(set: Set | CurrentSet): boolean;

/**
 * Вычисляет номер следующей партии
 * @param match - Объект матча
 * @returns Номер следующей партии (1-5)
 */
static calculateNextSetNumber(match: Match): number;

/**
 * Обрабатывает время в зависимости от статуса
 * @param status - Новый статус партии
 * @param updates - Объект с обновлениями
 * @returns Обновленный объект с обработанным временем
 */
static processTimeForStatus(status: SetStatus, updates: SetUpdates): SetUpdates;

/**
 * Защищает currentSet от изменений при редактировании завершенной партии
 * @param match - Объект матча
 * @param setNumber - Номер редактируемой партии
 * @returns Защищенный currentSet
 */
static protectCurrentSet(match: Match, setNumber: number): CurrentSet;
```

#### `MatchDomain.ts` - Логика матча

**Ответственность:**
- Вычисление счета по партиям
- Определение победителя
- Проверка завершенности матча

**Функции:**
```typescript
/**
 * Вычисляет счет по партиям для команды
 * @param match - Объект матча
 * @param team - Команда ('A' или 'B')
 * @returns Количество выигранных партий
 */
static calculateSetsScore(match: Match, team: 'A' | 'B'): number;

/**
 * Определяет победителя матча
 * @param match - Объект матча
 * @returns 'A', 'B' или null
 */
static getMatchWinner(match: Match): 'A' | 'B' | null;

/**
 * Проверяет, завершен ли матч
 * @param match - Объект матча
 * @returns true, если матч завершен
 */
static isMatchFinished(match: Match): boolean;
```

#### `SetStateMachine.ts` - Машина состояний

**Ответственность:**
- Управление переходами между состояниями
- Валидация переходов
- Определение доступных переходов

**Функции:**
```typescript
/**
 * Проверяет, возможен ли переход между состояниями
 * @param from - Текущее состояние
 * @param to - Целевое состояние
 * @param context - Контекст перехода (матч, партия)
 * @returns true, если переход возможен
 */
static canTransition(
  from: SetStatus, 
  to: SetStatus, 
  context: TransitionContext
): boolean;

/**
 * Возвращает список доступных переходов из текущего состояния
 * @param current - Текущее состояние
 * @param context - Контекст (матч, партия)
 * @returns Массив доступных состояний
 */
static getAvailableTransitions(
  current: SetStatus, 
  context: TransitionContext
): SetStatus[];

/**
 * Валидирует переход между состояниями
 * @param from - Текущее состояние
 * @param to - Целевое состояние
 * @param set - Партия
 * @param match - Объект матча
 * @returns Результат валидации
 */
static validateTransition(
  from: SetStatus, 
  to: SetStatus, 
  set: Set | CurrentSet, 
  match: Match
): ValidationResult;
```

### 4. API Layer: HTTP API для мобильного интерфейса

#### `MatchApiController.ts` - Контроллер API

**Ответственность:**
- Обработка HTTP запросов от мобильного интерфейса
- Валидация входных данных
- Использование Service Layer
- Обработка ошибок

**Методы:**
```typescript
/**
 * Обрабатывает запрос на изменение счета
 * @param match - Текущий матч
 * @param team - Команда ('A' или 'B')
 * @param delta - Изменение счета (+1 или -1)
 * @returns Результат операции
 */
static handleChangeScore(
  match: Match, 
  team: 'A' | 'B', 
  delta: number
): { success: boolean; match: Match; error?: string };

/**
 * Обрабатывает запрос на начало партии
 * @param match - Текущий матч
 * @returns Результат операции
 */
static handleStartSet(match: Match): { success: boolean; match: Match; error?: string };

/**
 * Обрабатывает запрос на завершение партии
 * @param match - Текущий матч
 * @returns Результат операции
 */
static handleFinishSet(match: Match): { success: boolean; match: Match; error?: string };

/**
 * Обрабатывает запрос на изменение подачи
 * @param match - Текущий матч
 * @param team - Команда ('A' или 'B')
 * @returns Результат операции
 */
static handleChangeServingTeam(
  match: Match, 
  team: 'A' | 'B'
): { success: boolean; match: Match; error?: string };

/**
 * Обрабатывает запрос на отмену действия
 * @param match - Текущий матч
 * @param history - История действий
 * @returns Результат операции
 */
static handleUndo(
  match: Match, 
  history: ActionHistory
): { success: boolean; match: Match; history: ActionHistory; error?: string };
```

**Важно:**
- Все методы используют Service Layer
- Нет прямой мутации объектов
- Валидация входных данных
- Структурированные ошибки

#### `MatchApiRoutes.ts` - Маршруты API

**Ответственность:**
- Определение HTTP маршрутов
- Обработка сессий
- Вызов контроллера
- Формирование ответов

**Маршруты:**
```typescript
POST /api/match/:sessionId/score
POST /api/match/:sessionId/set/start
POST /api/match/:sessionId/set/finish
POST /api/match/:sessionId/serve
POST /api/match/:sessionId/undo
```

---

### 5. Service Layer: Оркестрация

#### `SetService.ts` - Сервис партий

**Ответственность:**
- Оркестрация операций с партиями
- Использование Domain Layer
- Управление транзакциями

**Методы:**
```typescript
/**
 * Начинает партию
 * @param match - Объект матча
 * @returns Новый объект матча с начатой партией
 */
static startSet(match: Match): Match;

/**
 * Завершает текущую партию
 * @param match - Объект матча
 * @returns Новый объект матча с завершенной партией
 * @throws Error, если партия не может быть завершена
 */
static finishSet(match: Match): Match;

/**
 * Обновляет партию
 * @param match - Объект матча
 * @param setNumber - Номер партии
 * @param updates - Обновления
 * @returns Новый объект матча с обновленной партией
 * @throws Error, если обновление невалидно
 */
static updateSet(match: Match, setNumber: number, updates: SetUpdates): Match;

/**
 * Возвращает завершенную партию в игру
 * @param match - Объект матча
 * @param setNumber - Номер партии
 * @returns Новый объект матча с возобновленной партией
 * @throws Error, если возврат невозможен
 */
static resumeSet(match: Match, setNumber: number): Match;
```

#### `ScoreService.ts` - Сервис счета

**Ответственность:**
- Изменение счета
- Изменение подачи
- Валидация изменений

**Методы:**
```typescript
/**
 * Изменяет счет команды
 * @param match - Объект матча
 * @param team - Команда ('A' или 'B')
 * @param delta - Изменение счета (+1 или -1)
 * @returns Новый объект матча с измененным счетом
 * @throws Error, если изменение невозможно
 */
static changeScore(match: Match, team: 'A' | 'B', delta: number): Match;

/**
 * Изменяет команду с подачей
 * @param match - Объект матча
 * @param team - Команда ('A' или 'B')
 * @returns Новый объект матча с измененной подачей
 */
static changeServingTeam(match: Match, team: 'A' | 'B'): Match;
```

#### `HistoryService.ts` - Сервис истории

**Ответственность:**
- Управление историей действий
- Отмена действий
- Повтор действий (redo)

**Методы:**
```typescript
/**
 * Добавляет действие в историю
 * @param history - Текущая история
 * @param action - Действие для добавления
 * @returns Новая история
 */
static addAction(history: ActionHistory, action: ActionHistoryItem): ActionHistory;

/**
 * Отменяет последнее действие
 * @param history - Текущая история
 * @returns Новая история и состояние матча до действия
 */
static undo(history: ActionHistory): { history: ActionHistory; match: Match } | null;

/**
 * Повторяет отмененное действие
 * @param history - Текущая история
 * @returns Новая история и состояние матча после действия
 */
static redo(history: ActionHistory): { history: ActionHistory; match: Match } | null;
```

### 3. Validator Layer: Валидация

#### `SetValidator.ts` - Валидация партий

**Ответственность:**
- Валидация изменений партий
- Проверка бизнес-правил
- Проверка корректности данных

**Функции:**
```typescript
/**
 * Валидирует изменения партии
 * @param set - Текущая партия
 * @param updates - Предлагаемые изменения
 * @param match - Объект матча
 * @returns Результат валидации
 */
static validateSetUpdate(
  set: Set | CurrentSet, 
  updates: SetUpdates, 
  match: Match
): ValidationResult;
```

#### `TimeValidator.ts` - Валидация времени

**Ответственность:**
- Валидация времени партий
- Проверка пересечений времени
- Проверка корректности временных меток

**Функции:**
```typescript
/**
 * Проверяет пересечение времени с другими партиями
 * @param match - Объект матча
 * @param setNumber - Номер партии
 * @param startTime - Время начала
 * @param endTime - Время завершения
 * @returns Массив ошибок или null
 */
static validateTimeOverlap(
  match: Match, 
  setNumber: number, 
  startTime: number, 
  endTime: number
): string[] | null;
```

### 4. UI Layer: Представление

#### `useMatch.ts` - Хук управления матчем

**Ответственность:**
- Управление состоянием матча в React
- Использование Service Layer
- Предоставление API для компонентов

**API:**
```typescript
interface UseMatchReturn {
  match: Match | null;
  setMatch: (match: Match) => void;
  changeScore: (team: 'A' | 'B', delta: number) => void;
  changeServingTeam: (team: 'A' | 'B') => void;
  startSet: () => void;
  finishSet: () => void;
  updateSet: (setNumber: number, updates: SetUpdates) => boolean;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
  // Вычисляемые значения
  isSetballNow: boolean;
  setballTeam: 'A' | 'B' | null;
  isMatchballNow: boolean;
  matchballTeam: 'A' | 'B' | null;
  canFinish: boolean;
  currentSetStatus: SetStatus;
}
```

---

## План тестирования

### 1. Unit тесты для Domain Layer

**Цель:** Покрытие всех функций бизнес-логики

**Файлы:**
- `tests/unit/domain/SetDomain.test.ts`
- `tests/unit/domain/MatchDomain.test.ts`
- `tests/unit/domain/SetStateMachine.test.ts`

**Покрытие:**
- Все публичные методы
- Граничные случаи
- Ошибочные входные данные
- Все ветки условий

**Пример:**
```typescript
describe('SetDomain', () => {
  describe('isCurrentSet', () => {
    it('должен возвращать true для текущей партии в игре', () => {
      const match = createTestMatch({
        currentSet: { setNumber: 1, status: SET_STATUS.IN_PROGRESS }
      });
      expect(SetDomain.isCurrentSet(1, match)).toBe(true);
    });
    
    it('должен возвращать false для завершенной партии', () => {
      const match = createTestMatch({
        sets: [{ setNumber: 1, status: SET_STATUS.COMPLETED }],
        currentSet: { setNumber: 2, status: SET_STATUS.PENDING }
      });
      expect(SetDomain.isCurrentSet(1, match)).toBe(false);
    });
  });
});
```

### 2. Unit тесты для Service Layer

**Цель:** Покрытие всех сервисов

**Файлы:**
- `tests/unit/services/SetService.test.ts`
- `tests/unit/services/ScoreService.test.ts`
- `tests/unit/services/HistoryService.test.ts`

**Покрытие:**
- Все методы сервисов
- Успешные сценарии
- Ошибочные сценарии
- Валидация входных данных

### 3. Unit тесты для Validator Layer

**Цель:** Покрытие всех валидаторов

**Файлы:**
- `tests/unit/validators/SetValidator.test.ts`
- `tests/unit/validators/TimeValidator.test.ts`

**Покрытие:**
- Все правила валидации
- Граничные случаи
- Ошибочные данные

### 5. Unit тесты для API Layer

**Цель:** Покрытие всех API endpoints

**Файлы:**
- `tests/unit/api/MatchApiController.test.ts`

**Покрытие:**
- Все методы контроллера
- Валидация входных данных
- Обработка ошибок
- Интеграция с Service Layer

**Пример:**
```typescript
describe('MatchApiController', () => {
  describe('handleChangeScore', () => {
    it('должен изменять счет через ScoreService', () => {
      const match = createTestMatch();
      const result = MatchApiController.handleChangeScore(match, 'A', 1);
      expect(result.success).toBe(true);
      expect(result.match.currentSet.scoreA).toBe(1);
    });
    
    it('должен возвращать ошибку, если партия не начата', () => {
      const match = createTestMatch({
        currentSet: { status: SET_STATUS.PENDING }
      });
      const result = MatchApiController.handleChangeScore(match, 'A', 1);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
```

### 6. Интеграционные тесты

**Цель:** Проверка работы всей системы

**Файлы:**
- `tests/integration/match-flow.test.ts`
- `tests/integration/mobile-api.test.ts`

**Сценарии основного приложения:**
- Полный цикл матча (начало → игра → завершение)
- Редактирование партий
- Отмена действий
- Возврат завершенной партии в игру

**Сценарии мобильного API:**
- Изменение счета через мобильный интерфейс
- Начало партии через мобильный интерфейс
- Завершение партии через мобильный интерфейс
- Изменение подачи через мобильный интерфейс
- Отмена действия через мобильный интерфейс
- Синхронизация между основным приложением и мобильным

**Пример:**
```typescript
describe('Match Flow Integration', () => {
  it('должен корректно обрабатывать полный цикл матча', () => {
    let match = createNewMatch();
    
    // Начало партии
    match = SetService.startSet(match);
    expect(match.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
    
    // Начисление очков
    match = ScoreService.changeScore(match, 'A', 1);
    expect(match.currentSet.scoreA).toBe(1);
    
    // Завершение партии
    match = SetService.finishSet(match);
    expect(match.sets.length).toBe(1);
    expect(match.currentSet.status).toBe(SET_STATUS.PENDING);
  });
});
   ```

**Пример теста синхронизации:**
```typescript
describe('Mobile API Synchronization', () => {
  it('должен синхронизировать изменения между основным приложением и мобильным', async () => {
    let mainMatch = createNewMatch();
    let mobileMatch = createNewMatch();
    
    // Изменение в мобильном интерфейсе
    const mobileResult = MatchApiController.handleChangeScore(mobileMatch, 'A', 1);
    mobileMatch = mobileResult.match;
    
    // Синхронизация с основным приложением
    mainMatch = mobileMatch;
    
    // Проверка синхронизации
    expect(mainMatch.currentSet.scoreA).toBe(1);
    expect(mainMatch.updatedAt).toBe(mobileMatch.updatedAt);
  });
});
```

### 7. Тесты для React компонентов

**Цель:** Покрытие UI компонентов

**Файлы:**
- `tests/unit/renderer/useMatch.test.ts`
- `tests/unit/renderer/SetEditModal.test.tsx`

**Покрытие:**
- Все хуки
- Все компоненты
- Взаимодействие пользователя

---

## План документирования

### 1. JSDoc комментарии

**Стандарт:** JSDoc с TypeScript типами

**Пример:**
```typescript
/**
 * Определяет, является ли партия с указанным номером текущей.
 * 
 * Партия считается текущей, если:
 * - Её номер совпадает с номером currentSet
 * - Статус currentSet равен IN_PROGRESS
 * 
 * @param setNumber - Номер партии для проверки (1-5)
 * @param match - Объект матча
 * @returns true, если партия является текущей и в игре
 * 
 * @example
 * ```typescript
 * const match = {
 *   currentSet: { setNumber: 2, status: SET_STATUS.IN_PROGRESS }
 * };
 * SetDomain.isCurrentSet(2, match); // true
 * SetDomain.isCurrentSet(1, match); // false
 * ```
 * 
 * @throws {TypeError} Если setNumber не число или match не объект
 */
static isCurrentSet(setNumber: number, match: Match): boolean;
```

**Требования:**
- Описание функции
- Описание параметров
- Описание возвращаемого значения
- Примеры использования
- Описание исключений
- Описание побочных эффектов

**Диаграммы:**
1. **Диаграмма синхронизации (см. раздел выше)**
2. **Диаграмма состояний партии:**
   ```mermaid
   stateDiagram-v2
     [*] --> PENDING
     PENDING --> IN_PROGRESS: startSet()
     IN_PROGRESS --> COMPLETED: finishSet()
     IN_PROGRESS --> PENDING: updateSet(status=PENDING)
     COMPLETED --> IN_PROGRESS: updateSet(status=IN_PROGRESS)
     COMPLETED --> [*]
   ```

2. **Диаграмма потока начисления счета:**
   ```mermaid
   flowchart TD
     A[Пользователь кликает +1/-1] --> B{Партия начата?}
     B -->|Нет| C[Блокировка]
     B -->|Да| D[ScoreService.changeScore]
     D --> E[Обновление currentSet.score]
     E --> F{delta > 0?}
     F -->|Да| G[Переход подачи]
     F -->|Нет| H[Сохранение в историю]
     G --> H
     H --> I[Обновление match.updatedAt]
     I --> J[Синхронизация с vMix]
   ```

3. **Диаграмма потока начала партии:**
   ```mermaid
   flowchart TD
     A[Пользователь кликает "Начать партию"] --> B[SetDomain.calculateNextSetNumber]
     B --> C[SetService.startSet]
     C --> D[Обновление currentSet]
     D --> E[Установка startTime]
     E --> F[Сохранение в историю]
     F --> G[Синхронизация с vMix]
   ```

4. **Диаграмма потока завершения партии:**
   ```mermaid
   flowchart TD
     A[Пользователь кликает "Завершить партию"] --> B{canFinishSet?}
     B -->|Нет| C[Ошибка]
     B -->|Да| D[SetService.finishSet]
     D --> E[Создание completedSet]
     E --> F[Добавление в sets[]]
     F --> G[Сброс currentSet]
     G --> H[Сохранение в историю]
     H --> I[Синхронизация с vMix]
   ```

5. **Диаграмма потока редактирования партии:**
   ```mermaid
   flowchart TD
     A[Пользователь кликает на партию] --> B[Открытие SetEditModal]
     B --> C[Инициализация формы]
     C --> D[Пользователь изменяет данные]
     D --> E[Валидация изменений]
     E --> F{Валидация успешна?}
     F -->|Нет| G[Показ ошибок]
     F -->|Да| H[SetService.updateSet]
     H --> I{isCurrentSet?}
     I -->|Да| J[Обновление currentSet]
     I -->|Нет| K[Обновление sets[]]
     K --> L[SetDomain.protectCurrentSet]
     J --> M[Сохранение в историю]
     L --> M
     M --> N[Закрытие модального окна]
     N -->      O[Синхронизация с vMix]
   ```

6. **Диаграмма потока мобильного API:**
   ```mermaid
   flowchart TD
     A[Мобильный клиент] --> B[HTTP POST запрос]
     B --> C[MatchApiController]
     C --> D{Валидация сессии?}
     D -->|Нет| E[403 Forbidden]
     D -->|Да| F{Валидация данных?}
     F -->|Нет| G[400 Bad Request]
     F -->|Да| H[Service Layer]
     H --> I[Обновление match]
     I --> J[onMatchUpdate callback]
     J --> K[IPC в main процесс]
     K --> L[Обновление React UI]
     L --> M[Синхронизация с vMix]
     I --> N[200 OK + match]
   ```

### 4. Архитектурная документация

**Файл:** `docs/architecture/score-and-set-management-architecture.md`

**Содержание:**
- Описание слоев архитектуры
- Диаграммы зависимостей
- Описание потоков данных
- Примеры использования

### 5. API документация

**Файл:** `docs/api/match-management-api.md`

**Содержание:**
- Описание всех публичных API
- Примеры использования
- Описание параметров и возвращаемых значений
- Описание исключений

**Файл:** `docs/api/mobile-api.md`

**Содержание:**
- Описание HTTP API для мобильного интерфейса
- Примеры запросов и ответов
- Описание сессий
- Описание синхронизации

---

## Этапы реализации

### Этап 1: Подготовка (1-2 дня)

**Задачи:**
1. Настройка TypeScript конфигурации
2. Создание структуры папок
3. Настройка тестов
4. Создание базовых типов

**Результат:**
- Готовая инфраструктура для разработки
- Все инструменты настроены
- Базовые типы определены

**Критерии готовности:**
- TypeScript компилируется
- Тесты запускаются
- Структура папок создана

---

### Этап 2: Domain Layer (3-5 дней)

**Задачи:**
1. Создание `SetDomain.ts`
2. Создание `MatchDomain.ts`
3. Создание `SetStateMachine.ts`
4. Написание unit-тестов
5. JSDoc комментарии

**Приоритет функций:**
1. `SetDomain.isCurrentSet()` - критично
2. `SetDomain.isCompleted()` - критично
3. `SetDomain.calculateNextSetNumber()` - важно
4. `SetDomain.processTimeForStatus()` - важно
5. `SetDomain.protectCurrentSet()` - важно
6. `SetStateMachine.canTransition()` - важно
7. `SetStateMachine.getAvailableTransitions()` - важно

**Результат:**
- Все функции Domain Layer реализованы
- Покрытие тестами > 90%
- JSDoc комментарии для всех функций

**Критерии готовности:**
- Все тесты проходят
- Покрытие > 90%
- JSDoc комментарии добавлены
- TypeScript компилируется без ошибок

---

### Этап 3: Validator Layer (2-3 дня)

**Задачи:**
1. Создание `SetValidator.ts`
2. Создание `TimeValidator.ts`
3. Написание unit-тестов
4. JSDoc комментарии

**Результат:**
- Все валидаторы реализованы
- Покрытие тестами > 90%
- JSDoc комментарии

**Критерии готовности:**
- Все тесты проходят
- Покрытие > 90%
- JSDoc комментарии добавлены

---

### Этап 4: Service Layer (4-6 дней)

**Задачи:**
1. Создание `SetService.ts`
2. Создание `ScoreService.ts`
3. Создание `HistoryService.ts` (с оптимизацией)
4. Написание unit-тестов
5. JSDoc комментарии

**Приоритет сервисов:**
1. `ScoreService` - критично
2. `SetService` - критично
3. `HistoryService` - важно

**Результат:**
- Все сервисы реализованы
- Покрытие тестами > 90%
- JSDoc комментарии
- Оптимизированная история действий

**Критерии готовности:**
- Все тесты проходят
- Покрытие > 90%
- JSDoc комментарии добавлены
- История действий оптимизирована

---

### Этап 5: Миграция API Layer (4-5 дней)

**Задачи:**
1. Создание `MatchApiController.ts` с использованием Service Layer
2. Рефакторинг `MobileServer.ts` для использования контроллера
3. Удаление дублированной логики из `server.js`
4. Написание unit-тестов для API контроллера
5. JSDoc комментарии

**Приоритет:**
1. `MatchApiController.handleChangeScore()` - критично
2. `MatchApiController.handleStartSet()` - критично
3. `MatchApiController.handleFinishSet()` - критично
4. `MatchApiController.handleChangeServingTeam()` - важно
5. `MatchApiController.handleUndo()` - важно

**Результат:**
- API Layer использует Service Layer
- Дублирование логики устранено
- Тесты написаны
- JSDoc комментарии

**Критерии готовности:**
- Все тесты проходят
- Мобильный интерфейс работает
- Дублирование логики устранено
- JSDoc комментарии добавлены

---

### Этап 6: Миграция UI Layer (3-4 дня)

**Задачи:**
1. Рефакторинг `useMatch.ts` для использования Service Layer
2. Обновление компонентов
3. Написание тестов для хуков
4. JSDoc комментарии

**Результат:**
- Хуки используют Service Layer
- Компоненты обновлены
- Тесты написаны
- JSDoc комментарии

**Критерии готовности:**
- Все тесты проходят
- Функциональность сохранена
- JSDoc комментарии добавлены

---

### Этап 7: Интеграционные тесты (3-4 дня)

**Задачи:**
1. Написание интеграционных тестов для основного приложения
2. Написание интеграционных тестов для мобильного API
3. Тестирование синхронизации между основным приложением и мобильным
4. Покрытие всех сценариев
5. Проверка совместимости

**Приоритет:**
1. Тесты основного приложения - критично
2. Тесты мобильного API - критично
3. Тесты синхронизации - важно

**Результат:**
- Интеграционные тесты написаны
- Все сценарии покрыты
- Синхронизация проверена
- Совместимость проверена

**Критерии готовности:**
- Все интеграционные тесты проходят
- Покрытие всех сценариев
- Синхронизация работает корректно

---

### Этап 8: Документирование (2-3 дня)

**Задачи:**
1. Создание диаграмм состояний
2. Создание диаграмм потоков данных
3. Написание архитектурной документации
4. Написание API документации

**Результат:**
- Все диаграммы созданы
- Документация написана
- Примеры добавлены

**Критерии готовности:**
- Все диаграммы созданы
- Документация полная
- Примеры работают

---

### Этап 9: Финальное тестирование (2-3 дня)

**Задачи:**
1. Полное тестирование функциональности
2. Проверка всех edge cases
3. Проверка производительности
4. Исправление найденных проблем

**Результат:**
- Все тесты проходят
- Edge cases обработаны
- Производительность приемлема
- Проблемы исправлены

**Критерии готовности:**
- Все тесты проходят
- Нет критических багов
- Производительность приемлема

---

## Критерии успеха

### Функциональность

- ✅ Все существующие функции работают как раньше
- ✅ Нет регрессий
- ✅ Все edge cases обработаны

### Качество кода

- ✅ TypeScript компилируется без ошибок
- ✅ Нет `any` типов (кроме специальных случаев)
- ✅ ESLint проходит проверку
- ✅ Код читаемый и понятный

### Тестирование

- ✅ Покрытие unit-тестами > 90%
- ✅ Покрытие интеграционными тестами > 80%
- ✅ Все тесты проходят
- ✅ Тесты быстрые (< 5 секунд для всех unit-тестов)

### Документирование

- ✅ JSDoc комментарии для всех публичных функций
- ✅ Диаграммы состояний созданы
- ✅ Диаграммы потоков данных созданы
- ✅ Архитектурная документация написана
- ✅ API документация написана

### Производительность

- ✅ История действий оптимизирована (diff вместо полных копий)
- ✅ Нет утечек памяти
- ✅ Приложение работает плавно

### Масштабируемость

- ✅ Легко добавлять новые функции
- ✅ Легко изменять существующие функции
- ✅ Четкое разделение ответственности
- ✅ Минимальные зависимости

---

## Риски и митигация

### Риск 1: Регрессии при рефакторинге

**Митигация:**
- Постепенная миграция
- Сохранение старого кода до полной миграции
- Обширное тестирование
- Feature flags для переключения

### Риск 2: Сложность миграции на TypeScript

**Митигация:**
- Постепенная миграция файл за файлом
- Использование `// @ts-ignore` временно
- Строгая типизация с самого начала

### Риск 3: Несовместимость с существующим кодом

**Митигация:**
- Сохранение обратной совместимости
- Адаптеры для старого API
- Постепенная миграция

### Риск 4: Недостаточное покрытие тестами

**Митигация:**
- Написание тестов параллельно с кодом
- Использование TDD где возможно
- Минимальное покрытие 90%

---

## Метрики успеха

### До рефакторинга

- Строк кода в `useMatch.js`: ~800
- Строк кода в `server.js` (дублирование): ~200
- Дублирование логики: 5+ мест (включая мобильный сервер)
- Покрытие тестами: ~20%
- TypeScript типы: частично
- JSDoc комментарии: минимально
- Мобильный сервер: прямая мутация, нет валидации

### После рефакторинга

- Строк кода в Domain Layer: ~500
- Строк кода в Service Layer: ~400
- Строк кода в API Layer: ~300
- Дублирование логики: 0
- Покрытие тестами: > 90%
- TypeScript типы: 100%
- JSDoc комментарии: 100%
- Мобильный сервер: использует Service Layer, валидация, immutability

---

## Учет мобильного интерфейса

### Текущее состояние мобильного интерфейса

**Архитектура:**
- HTTP сервер (`MobileServer`) в main процессе
- Мобильный интерфейс открывается в браузере на мобильном устройстве
- API endpoints для управления матчем
- Синхронизация через IPC (`load-match` событие)

**Проблемы:**
1. Дублирование логики в `server.js` (строки 189-433)
2. Прямая мутация `this.currentMatch`
3. Нет валидации (кроме базовой)
4. Упрощенная логика (например, `sets.length + 1` для номера партии)
5. Нет истории действий (undo через передачу `previousState`)

### Решение в новой архитектуре

**API Layer:**
- `MatchApiController.ts` - использует Service Layer
- `MatchApiRoutes.ts` - HTTP маршруты
- Нет дублирования логики
- Валидация входных данных
- Immutability (нет мутаций)

**Синхронизация:**
- Мобильный сервер использует те же сервисы, что и основное приложение
- Единая история действий (через `HistoryService`)
- Синхронизация через IPC с обновленным match

**Преимущества:**
- Единая точка истины для логики
- Нет рассинхронизации
- Легко тестировать
- Легко поддерживать

### Миграция мобильного сервера

**Этап 1: Создание API Layer**
- Создать `MatchApiController.ts`
- Перенести логику из `server.js` в контроллер
- Использовать Service Layer

**Этап 2: Рефакторинг MobileServer**
- Обновить `MobileServer.ts` для использования контроллера
- Удалить дублированную логику
- Добавить валидацию

**Этап 3: Синхронизация истории**
- Использовать `HistoryService` в мобильном сервере
- Синхронизировать историю между основным приложением и мобильным

**Этап 4: Тестирование**
- Unit-тесты для API контроллера
- Интеграционные тесты для мобильного API
- Тесты синхронизации

---

## Заключение

Данный план рефакторинга обеспечивает:
- ✅ Четкую, понятную, простую систему
- ✅ Разделение ответственности
- ✅ Покрытие тестами
- ✅ JSDoc комментарии
- ✅ Переход на TypeScript
- ✅ Документирование с диаграммами
- ✅ Учет мобильного интерфейса
- ✅ Единая логика для основного приложения и мобильного
- ✅ Синхронизация состояния

**Следующие шаги:**
1. Утверждение плана
2. Начало реализации Этапа 1
3. Постепенная миграция с сохранением функциональности
4. Параллельная миграция основного приложения и мобильного API

---

**Дата создания:** 2025-01-XX  
**Версия плана:** 1.1 (добавлен учет мобильного интерфейса)

---

## Связанные документы

- [Анализ многопроцессной архитектуры](./multi-process-architecture-analysis.md) - анализ целесообразности вынесения компонентов в отдельные процессы
