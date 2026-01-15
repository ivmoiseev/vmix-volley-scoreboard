# Руководство по реализации: Рефакторинг управления счетом и состояниями партий

**Дата создания:** 2025-01-XX  
**Статус:** Практическое руководство для программиста  
**Основано на:** [План рефакторинга](./score-and-set-status-refactoring-plan.md)

---

## Оглавление

1. [Подготовка к работе](#подготовка-к-работе)
2. [Этап 1: Подготовка инфраструктуры](#этап-1-подготовка-инфраструктуры)
3. [Этап 2: Domain Layer](#этап-2-domain-layer)
4. [Этап 3: Validator Layer](#этап-3-validator-layer)
5. [Этап 4: Service Layer](#этап-4-service-layer)
6. [Этап 5: API Layer](#этап-5-api-layer)
7. [Этап 6: UI Layer](#этап-6-ui-layer)
8. [Этап 7: Интеграционные тесты](#этап-7-интеграционные-тесты)
9. [Этап 8: Документирование](#этап-8-документирование)
10. [Этап 9: Финальное тестирование](#этап-9-финальное-тестирование)
11. [Чек-листы и критерии готовности](#чек-листы-и-критерии-готовности)
12. [Типичные проблемы и решения](#типичные-проблемы-и-решения)

---

## Подготовка к работе

### Предварительные требования

1. **Ознакомление с документацией:**
   - ✅ Прочитать [План рефакторинга](./score-and-set-status-refactoring-plan.md)
   - ✅ Прочитать [Документацию логики](./score-and-set-status-logic-documentation.md)
   - ✅ Изучить текущую структуру проекта

2. **Настройка окружения:**
   ```bash
   # Убедитесь, что все зависимости установлены
   npm install
   
   # Запустите тесты, чтобы убедиться, что все работает
   npm test
   
   # Проверьте, что проект собирается
   npm run build
   ```

3. **Создание ветки для рефакторинга:**
   ```bash
   git checkout -b refactor/score-and-set-status
   ```

4. **Подготовка инструментов:**
   - TypeScript компилятор настроен
   - ESLint настроен
   - Jest настроен для тестов
   - Редактор с поддержкой TypeScript

---

## Этап 1: Подготовка инфраструктуры

**Время:** 1-2 дня  
**Приоритет:** Критично

### Задачи

#### 1.1. Настройка TypeScript

**Файл:** `tsconfig.json`

**Действия:**
1. Убедитесь, что `tsconfig.json` существует и настроен
2. Проверьте настройки:
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "ESNext",
       "lib": ["ES2020", "DOM"],
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "moduleResolution": "node",
       "resolveJsonModule": true,
       "allowSyntheticDefaultImports": true,
       "noEmit": true,
       "jsx": "react-jsx"
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist", "release"]
   }
   ```

3. Установите TypeScript, если еще не установлен:
   ```bash
   npm install --save-dev typescript @types/node @types/react @types/react-dom
   ```

**Чек-лист:**
- [ ] `tsconfig.json` настроен
- [ ] TypeScript компилируется без ошибок: `npx tsc --noEmit`
- [ ] Все зависимости установлены

---

#### 1.2. Создание структуры папок

**Действия:**
1. Создайте структуру папок для новой архитектуры:
   ```bash
   mkdir -p src/shared/domain
   mkdir -p src/shared/services
   mkdir -p src/shared/validators
   mkdir -p src/main/server/api
   mkdir -p tests/unit/domain
   mkdir -p tests/unit/services
   mkdir -p tests/unit/validators
   mkdir -p tests/unit/api
   mkdir -p tests/integration
   ```

2. Создайте файлы-заглушки:
   ```bash
   # Domain Layer
   touch src/shared/domain/SetDomain.ts
   touch src/shared/domain/MatchDomain.ts
   touch src/shared/domain/SetStateMachine.ts
   
   # Service Layer
   touch src/shared/services/SetService.ts
   touch src/shared/services/ScoreService.ts
   touch src/shared/services/HistoryService.ts
   
   # Validator Layer
   touch src/shared/validators/SetValidator.ts
   touch src/shared/validators/TimeValidator.ts
   
   # API Layer
   touch src/main/server/api/MatchApiController.ts
   touch src/main/server/api/MatchApiRoutes.ts
   ```

**Чек-лист:**
- [ ] Все папки созданы
- [ ] Все файлы-заглушки созданы
- [ ] Структура соответствует плану

---

#### 1.3. Обновление типов

**Файл:** `src/shared/types/Match.ts`

**Действия:**
1. Откройте существующий файл `Match.ts`
2. Убедитесь, что все необходимые типы определены:
   ```typescript
   export enum SET_STATUS {
     PENDING = 'pending',
     IN_PROGRESS = 'in_progress',
     COMPLETED = 'completed',
   }
   
   export interface Set {
     setNumber: number;
     scoreA: number;
     scoreB: number;
     status: SET_STATUS;
     completed: boolean;
     startTime?: number;
     endTime?: number;
     duration?: number;
   }
   
   export interface CurrentSet {
     setNumber: number;
     scoreA: number;
     scoreB: number;
     status: SET_STATUS;
     servingTeam: 'A' | 'B';
     startTime?: number;
     endTime?: number;
   }
   
   export interface Match {
     matchId: string;
     teamA: Team;
     teamB: Team;
     currentSet: CurrentSet;
     sets: Set[];
     updatedAt: string;
     // ... остальные поля
   }
   ```

3. Добавьте недостающие типы, если нужно

**Чек-лист:**
- [ ] Все типы определены
- [ ] Типы соответствуют текущей структуре данных
- [ ] TypeScript компилируется без ошибок

---

## Этап 2: Domain Layer

**Время:** 3-5 дней  
**Приоритет:** Критично

### Задачи

#### 2.1. Создание `SetDomain.ts`

**Файл:** `src/shared/domain/SetDomain.ts`

**Инструкции:**

1. **Создайте файл с базовой структурой:**
   ```typescript
   import { Set, CurrentSet, SET_STATUS, Match } from '../../types/Match.js';
   
   /**
    * Domain Layer для работы с партиями
    * Чистая бизнес-логика без зависимостей от UI
    */
   export class SetDomain {
     /**
      * Определяет, является ли партия текущей (активно играющей)
      * @param setNumber - Номер партии
      * @param currentSet - Текущая партия из match
      * @returns true, если партия является текущей и в игре
      */
     static isCurrentSet(setNumber: number, currentSet: CurrentSet): boolean {
       return currentSet.setNumber === setNumber && 
              currentSet.status === SET_STATUS.IN_PROGRESS;
     }
     
     /**
      * Определяет, завершена ли партия
      * @param set - Партия для проверки
      * @returns true, если партия завершена
      */
     static isCompleted(set: Set): boolean {
       return set.completed === true || set.status === SET_STATUS.COMPLETED;
     }
     
     // ... остальные методы
   }
   ```

2. **Реализуйте методы по приоритету:**
   - ✅ `isCurrentSet()` - критично
   - ✅ `isCompleted()` - критично
   - ✅ `calculateNextSetNumber()` - важно
   - ✅ `processTimeForStatus()` - важно
   - ✅ `protectCurrentSet()` - важно

3. **Напишите тесты для каждого метода:**
   ```typescript
   // tests/unit/domain/SetDomain.test.ts
   import { SetDomain } from '../../../src/shared/domain/SetDomain.js';
   import { SET_STATUS } from '../../../src/shared/types/Match.js';
   
   describe('SetDomain', () => {
     describe('isCurrentSet', () => {
       it('должен возвращать true для текущей партии в игре', () => {
         const currentSet = {
           setNumber: 1,
           status: SET_STATUS.IN_PROGRESS,
           // ...
         };
         expect(SetDomain.isCurrentSet(1, currentSet)).toBe(true);
       });
       
       it('должен возвращать false для партии со статусом PENDING', () => {
         const currentSet = {
           setNumber: 1,
           status: SET_STATUS.PENDING,
           // ...
         };
         expect(SetDomain.isCurrentSet(1, currentSet)).toBe(false);
       });
     });
   });
   ```

**Чек-лист:**
- [ ] Все методы реализованы
- [ ] Тесты написаны и проходят
- [ ] Покрытие тестами > 90%
- [ ] JSDoc комментарии добавлены
- [ ] TypeScript компилируется без ошибок

---

#### 2.2. Создание `MatchDomain.ts`

**Файл:** `src/shared/domain/MatchDomain.ts`

**Инструкции:**

1. **Создайте файл с методами для работы с матчем:**
   ```typescript
   import { Match, Set, CurrentSet } from '../../types/Match.js';
   
   export class MatchDomain {
     /**
      * Получает максимальный номер партии из завершенных партий
      * @param match - Матч
      * @returns Максимальный номер партии или 0
      */
     static getMaxSetNumber(match: Match): number {
       if (match.sets.length === 0) return 0;
       return Math.max(...match.sets.map(s => s.setNumber));
     }
     
     // ... остальные методы
   }
   ```

2. **Реализуйте методы:**
   - ✅ `getMaxSetNumber()` - критично
   - ✅ `getCompletedSets()` - важно
   - ✅ `getSetsWonByTeam()` - важно

3. **Напишите тесты**

**Чек-лист:**
- [ ] Все методы реализованы
- [ ] Тесты написаны и проходят
- [ ] Покрытие тестами > 90%
- [ ] JSDoc комментарии добавлены

---

#### 2.3. Создание `SetStateMachine.ts`

**Файл:** `src/shared/domain/SetStateMachine.ts`

**Инструкции:**

1. **Создайте машину состояний:**
   ```typescript
   import { SET_STATUS } from '../../types/Match.js';
   
   export class SetStateMachine {
     /**
      * Проверяет, возможен ли переход между состояниями
      * @param from - Текущее состояние
      * @param to - Целевое состояние
      * @param context - Контекст (например, есть ли следующая партия)
      * @returns true, если переход возможен
      */
     static canTransition(
       from: SET_STATUS,
       to: SET_STATUS,
       context?: { hasNextSet?: boolean }
     ): boolean {
       // Реализация правил переходов
       if (from === SET_STATUS.PENDING && to === SET_STATUS.IN_PROGRESS) {
         return true;
       }
       if (from === SET_STATUS.IN_PROGRESS && to === SET_STATUS.COMPLETED) {
         return true;
       }
       // ... остальные правила
       return false;
     }
     
     /**
      * Получает список доступных переходов из текущего состояния
      * @param currentStatus - Текущее состояние
      * @param context - Контекст
      * @returns Массив доступных состояний
      */
     static getAvailableTransitions(
       currentStatus: SET_STATUS,
       context?: { hasNextSet?: boolean; isCompleted?: boolean }
     ): SET_STATUS[] {
       // Реализация
     }
   }
   ```

2. **Реализуйте логику переходов:**
   - ✅ `canTransition()` - важно
   - ✅ `getAvailableTransitions()` - важно

3. **Напишите тесты для всех возможных переходов**

**Чек-лист:**
- [ ] Машина состояний реализована
- [ ] Все переходы покрыты тестами
- [ ] Тесты проходят
- [ ] JSDoc комментарии добавлены

---

## Этап 3: Validator Layer

**Время:** 2-3 дня  
**Приоритет:** Важно

### Задачи

#### 3.1. Создание `SetValidator.ts`

**Файл:** `src/shared/validators/SetValidator.ts`

**Инструкции:**

1. **Создайте валидатор:**
   ```typescript
   import { Set, CurrentSet, SET_STATUS } from '../../types/Match.js';
   
   export interface ValidationResult {
     valid: boolean;
     errors: string[];
   }
   
   export class SetValidator {
     /**
      * Валидирует обновление партии
      * @param set - Партия для валидации
      * @param updates - Обновления
      * @returns Результат валидации
      */
     static validateSetUpdate(
       set: Set | CurrentSet,
       updates: Partial<Set>
     ): ValidationResult {
       const errors: string[] = [];
       
       // Валидация счета
       if (updates.scoreA !== undefined) {
         if (updates.scoreA < 0) {
           errors.push('Счет команды A не может быть отрицательным');
         }
       }
       
       if (updates.scoreB !== undefined) {
         if (updates.scoreB < 0) {
           errors.push('Счет команды B не может быть отрицательным');
         }
       }
       
       // Валидация статуса
       if (updates.status !== undefined) {
         // Проверка правильности статуса
         if (!Object.values(SET_STATUS).includes(updates.status)) {
           errors.push('Некорректный статус партии');
         }
       }
       
       return {
         valid: errors.length === 0,
         errors,
       };
     }
   }
   ```

2. **Реализуйте все правила валидации:**
   - ✅ Валидация счета
   - ✅ Валидация статуса
   - ✅ Валидация времени
   - ✅ Валидация бизнес-правил

3. **Напишите тесты для всех правил**

**Чек-лист:**
- [ ] Все правила валидации реализованы
- [ ] Тесты написаны и проходят
- [ ] Покрытие тестами > 90%
- [ ] JSDoc комментарии добавлены

---

#### 3.2. Создание `TimeValidator.ts`

**Файл:** `src/shared/validators/TimeValidator.ts`

**Инструкции:**

1. **Создайте валидатор времени:**
   ```typescript
   export class TimeValidator {
     /**
      * Проверяет, не пересекаются ли временные интервалы партий
      * @param set1 - Первая партия
      * @param set2 - Вторая партия
      * @returns true, если интервалы не пересекаются
      */
     static validateTimeOverlap(
       set1: { startTime?: number; endTime?: number },
       set2: { startTime?: number; endTime?: number }
     ): boolean {
       // Реализация проверки пересечения
     }
   }
   ```

2. **Реализуйте валидацию времени:**
   - ✅ Проверка пересечения временных интервалов
   - ✅ Проверка корректности времени начала/окончания

3. **Напишите тесты**

**Чек-лист:**
- [ ] Валидация времени реализована
- [ ] Тесты написаны и проходят
- [ ] Покрытие тестами > 90%
- [ ] JSDoc комментарии добавлены

---

## Этап 4: Service Layer

**Время:** 4-6 дней  
**Приоритет:** Критично

### Задачи

#### 4.1. Создание `SetService.ts`

**Файл:** `src/shared/services/SetService.ts`

**Инструкции:**

1. **Создайте сервис:**
   ```typescript
   import { Match, SET_STATUS } from '../../types/Match.js';
   import { SetDomain } from '../domain/SetDomain.js';
   import { SetStateMachine } from '../domain/SetStateMachine.js';
   import { SetValidator } from '../validators/SetValidator.js';
   
   export class SetService {
     /**
      * Начинает новую партию
      * @param match - Текущий матч
      * @returns Новый матч с начатой партией
      */
     static startSet(match: Match): Match {
       // 1. Валидация
       if (match.currentSet.status !== SET_STATUS.PENDING) {
         throw new Error('Партия уже начата или завершена');
       }
       
       // 2. Вычисление номера партии
       const nextSetNumber = SetDomain.calculateNextSetNumber(match);
       
       // 3. Создание нового матча (immutability)
       const newMatch: Match = {
         ...match,
         currentSet: {
           ...match.currentSet,
           setNumber: nextSetNumber,
           status: SET_STATUS.IN_PROGRESS,
           scoreA: 0,
           scoreB: 0,
           startTime: Date.now(),
         },
         updatedAt: new Date().toISOString(),
       };
       
       return newMatch;
     }
     
     /**
      * Завершает текущую партию
      * @param match - Текущий матч
      * @returns Новый матч с завершенной партией
      */
     static finishSet(match: Match): Match {
       // 1. Валидация
       if (match.currentSet.status !== SET_STATUS.IN_PROGRESS) {
         throw new Error('Партия не начата');
       }
       
       // 2. Проверка правил завершения
       const canFinish = this.canFinishSet(match);
       if (!canFinish) {
         throw new Error('Партия не может быть завершена');
       }
       
       // 3. Создание завершенной партии
       const completedSet = {
         setNumber: match.currentSet.setNumber,
         scoreA: match.currentSet.scoreA,
         scoreB: match.currentSet.scoreB,
         status: SET_STATUS.COMPLETED,
         completed: true,
         startTime: match.currentSet.startTime,
         endTime: Date.now(),
         duration: match.currentSet.startTime 
           ? Date.now() - match.currentSet.startTime 
           : undefined,
       };
       
       // 4. Создание нового матча (immutability)
       const newMatch: Match = {
         ...match,
         sets: [...match.sets, completedSet],
         currentSet: {
           ...match.currentSet,
           status: SET_STATUS.PENDING,
           scoreA: 0,
           scoreB: 0,
           startTime: undefined,
           endTime: undefined,
         },
         updatedAt: new Date().toISOString(),
       };
       
       return newMatch;
     }
     
     /**
      * Обновляет партию
      * @param match - Текущий матч
      * @param setNumber - Номер партии для обновления
      * @param updates - Обновления
      * @returns Новый матч с обновленной партией
      */
     static updateSet(
       match: Match,
       setNumber: number,
       updates: Partial<Set>
     ): Match {
       // 1. Валидация
       const validation = SetValidator.validateSetUpdate(
         // Найти партию в sets или currentSet
         this.findSet(match, setNumber),
         updates
       );
       
       if (!validation.valid) {
         throw new Error(validation.errors.join(', '));
       }
       
       // 2. Проверка, является ли партия текущей
       const isCurrentSet = SetDomain.isCurrentSet(
         setNumber,
         match.currentSet
       );
       
       // 3. Обновление партии
       if (isCurrentSet) {
         // Обновляем currentSet
         return {
           ...match,
           currentSet: {
             ...match.currentSet,
             ...updates,
           },
           updatedAt: new Date().toISOString(),
         };
       } else {
         // Обновляем в sets
         const setIndex = match.sets.findIndex(s => s.setNumber === setNumber);
         if (setIndex === -1) {
           throw new Error('Партия не найдена');
         }
         
         return {
           ...match,
           sets: match.sets.map((s, i) => 
             i === setIndex ? { ...s, ...updates } : s
           ),
           updatedAt: new Date().toISOString(),
         };
       }
     }
   }
   ```

2. **Реализуйте все методы:**
   - ✅ `startSet()` - критично
   - ✅ `finishSet()` - критично
   - ✅ `updateSet()` - критично

3. **Напишите тесты для всех методов**

**Чек-лист:**
- [ ] Все методы реализованы
- [ ] Используется Domain Layer
- [ ] Используется Validator Layer
- [ ] Immutability соблюдена
- [ ] Тесты написаны и проходят
- [ ] Покрытие тестами > 90%
- [ ] JSDoc комментарии добавлены

---

#### 4.2. Создание `ScoreService.ts`

**Файл:** `src/shared/services/ScoreService.ts`

**Инструкции:**

1. **Создайте сервис для работы со счетом:**
   ```typescript
   import { Match } from '../../types/Match.js';
   import { SetDomain } from '../domain/SetDomain.js';
   
   export class ScoreService {
     /**
      * Изменяет счет команды
      * @param match - Текущий матч
      * @param team - Команда ('A' или 'B')
      * @param delta - Изменение счета (+1 или -1)
      * @returns Новый матч с обновленным счетом
      */
     static changeScore(
       match: Match,
       team: 'A' | 'B',
       delta: number
     ): Match {
       // 1. Валидация
       if (match.currentSet.status !== SET_STATUS.IN_PROGRESS) {
         throw new Error('Партия не начата');
       }
       
       // 2. Обновление счета
       const newScore = team === 'A'
         ? Math.max(0, match.currentSet.scoreA + delta)
         : Math.max(0, match.currentSet.scoreB + delta);
       
       // 3. Создание нового матча (immutability)
       const newMatch: Match = {
         ...match,
         currentSet: {
           ...match.currentSet,
           [team === 'A' ? 'scoreA' : 'scoreB']: newScore,
           servingTeam: delta > 0 ? team : match.currentSet.servingTeam,
         },
         updatedAt: new Date().toISOString(),
       };
       
       return newMatch;
     }
   }
   ```

2. **Реализуйте методы:**
   - ✅ `changeScore()` - критично

3. **Напишите тесты**

**Чек-лист:**
- [ ] Все методы реализованы
- [ ] Тесты написаны и проходят
- [ ] Покрытие тестами > 90%
- [ ] JSDoc комментарии добавлены

---

#### 4.3. Создание `HistoryService.ts`

**Файл:** `src/shared/services/HistoryService.ts`

**Инструкции:**

1. **Создайте сервис для истории действий:**
   ```typescript
   export interface Action {
     type: string;
     timestamp: number;
     data: any;
   }
   
   export class HistoryService {
     private static history: Action[] = [];
     private static maxHistorySize = 100;
     
     /**
      * Добавляет действие в историю
      * @param action - Действие
      */
     static addAction(action: Action): void {
       this.history.push(action);
       
       // Ограничиваем размер истории
       if (this.history.length > this.maxHistorySize) {
         this.history.shift();
       }
     }
     
     /**
      * Отменяет последнее действие
      * @returns Предыдущее состояние или null
      */
     static undoLastAction(): Action | null {
       if (this.history.length === 0) {
         return null;
       }
       
       return this.history.pop() || null;
     }
     
     /**
      * Очищает историю
      */
     static clearHistory(): void {
       this.history = [];
     }
   }
   ```

2. **Реализуйте методы:**
   - ✅ `addAction()` - важно
   - ✅ `undoLastAction()` - важно
   - ✅ `clearHistory()` - важно

3. **Напишите тесты**

**Чек-лист:**
- [ ] Все методы реализованы
- [ ] Тесты написаны и проходят
- [ ] Покрытие тестами > 90%
- [ ] JSDoc комментарии добавлены

---

## Этап 5: API Layer

**Время:** 4-5 дней  
**Приоритет:** Критично

### Задачи

#### 5.1. Создание `MatchApiController.ts`

**Файл:** `src/main/server/api/MatchApiController.ts`

**Инструкции:**

1. **Создайте контроллер:**
   ```typescript
   import { Match } from '../../../shared/types/Match.js';
   import { SetService } from '../../../shared/services/SetService.js';
   import { ScoreService } from '../../../shared/services/ScoreService.js';
   import { HistoryService } from '../../../shared/services/HistoryService.js';
   
   export interface ApiResponse<T> {
     success: boolean;
     data?: T;
     error?: string;
   }
   
   export class MatchApiController {
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
     ): ApiResponse<Match> {
       try {
         // Валидация входных данных
         if (team !== 'A' && team !== 'B') {
           return {
             success: false,
             error: 'Некорректная команда',
           };
         }
         
         if (delta !== 1 && delta !== -1) {
           return {
             success: false,
             error: 'Некорректное изменение счета',
           };
         }
         
         // Используем Service Layer
         const newMatch = ScoreService.changeScore(match, team, delta);
         
         // Добавляем в историю
         HistoryService.addAction({
           type: 'score_change',
           timestamp: Date.now(),
           data: { team, delta, previousMatch: match },
         });
         
         return {
           success: true,
           data: newMatch,
         };
       } catch (error) {
         return {
           success: false,
           error: error instanceof Error ? error.message : 'Неизвестная ошибка',
         };
       }
     }
     
     /**
      * Обрабатывает запрос на начало партии
      */
     static handleStartSet(match: Match): ApiResponse<Match> {
       try {
         const newMatch = SetService.startSet(match);
         
         HistoryService.addAction({
           type: 'start_set',
           timestamp: Date.now(),
           data: { previousMatch: match },
         });
         
         return {
           success: true,
           data: newMatch,
         };
       } catch (error) {
         return {
           success: false,
           error: error instanceof Error ? error.message : 'Неизвестная ошибка',
         };
       }
     }
     
     /**
      * Обрабатывает запрос на завершение партии
      */
     static handleFinishSet(match: Match): ApiResponse<Match> {
       try {
         const newMatch = SetService.finishSet(match);
         
         HistoryService.addAction({
           type: 'finish_set',
           timestamp: Date.now(),
           data: { previousMatch: match },
         });
         
         return {
           success: true,
           data: newMatch,
         };
       } catch (error) {
         return {
           success: false,
           error: error instanceof Error ? error.message : 'Неизвестная ошибка',
         };
       }
     }
     
     // ... остальные методы
   }
   ```

2. **Реализуйте все методы:**
   - ✅ `handleChangeScore()` - критично
   - ✅ `handleStartSet()` - критично
   - ✅ `handleFinishSet()` - критично
   - ✅ `handleChangeServingTeam()` - важно
   - ✅ `handleUndo()` - важно

3. **Напишите тесты**

**Чек-лист:**
- [ ] Все методы реализованы
- [ ] Используется Service Layer
- [ ] Валидация входных данных
- [ ] Обработка ошибок
- [ ] Тесты написаны и проходят
- [ ] Покрытие тестами > 90%
- [ ] JSDoc комментарии добавлены

---

#### 5.2. Рефакторинг `MobileServer.ts`

**Файл:** `src/main/server.js`

**Инструкции:**

1. **Импортируйте контроллер:**
   ```javascript
   import { MatchApiController } from './api/MatchApiController.js';
   ```

2. **Замените прямую логику на вызовы контроллера:**
   ```javascript
   // БЫЛО:
   this.app.post('/api/match/:sessionId/score', (req, res) => {
     // Прямая мутация match
     this.currentMatch.currentSet.scoreA = Math.max(0, 
       this.currentMatch.currentSet.scoreA + (delta || 0));
   });
   
   // СТАЛО:
   this.app.post('/api/match/:sessionId/score', (req, res) => {
     try {
       const { sessionId } = req.params;
       const { team, delta } = req.body;
       
       if (!this.validateSession(sessionId)) {
         return res.status(403).json({ error: 'Неверная сессия' });
       }
       
       if (!this.currentMatch) {
         return res.status(404).json({ error: 'Матч не найден' });
       }
       
       // Используем контроллер
       const result = MatchApiController.handleChangeScore(
         this.currentMatch,
         team,
         delta
       );
       
       if (!result.success) {
         return res.status(400).json({ error: result.error });
       }
       
       // Обновляем match
       this.currentMatch = result.data;
       
       // Уведомляем основное приложение
       if (this.onMatchUpdate) {
         this.onMatchUpdate(this.currentMatch);
       }
       
       res.json({ success: true, match: this.currentMatch });
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });
   ```

3. **Замените все endpoints аналогичным образом**

**Чек-лист:**
- [ ] Все endpoints используют контроллер
- [ ] Дублированная логика удалена
- [ ] Тесты проходят
- [ ] Мобильный интерфейс работает

---

## Этап 6: UI Layer

**Время:** 3-4 дня  
**Приоритет:** Критично

### Задачи

#### 6.1. Рефакторинг `useMatch.ts`

**Файл:** `src/renderer/hooks/useMatch.ts`

**Инструкции:**

1. **Импортируйте сервисы:**
   ```typescript
   import { SetService } from '../../shared/services/SetService.js';
   import { ScoreService } from '../../shared/services/ScoreService.js';
   import { HistoryService } from '../../shared/services/HistoryService.js';
   ```

2. **Замените прямую логику на вызовы сервисов:**
   ```typescript
   // БЫЛО:
   const changeScore = useCallback((team, delta) => {
     setMatch(prevMatch => {
       const newMatch = { ...prevMatch };
       newMatch.currentSet.scoreA = Math.max(0, 
         newMatch.currentSet.scoreA + delta);
       return newMatch;
     });
   }, []);
   
   // СТАЛО:
   const changeScore = useCallback((team: 'A' | 'B', delta: number) => {
     setMatch(prevMatch => {
       if (!prevMatch) return prevMatch;
       
       try {
         // Сохраняем в историю
         HistoryService.addAction({
           type: 'score_change',
           timestamp: Date.now(),
           data: { team, delta, previousMatch: prevMatch },
         });
         
         // Используем Service Layer
         return ScoreService.changeScore(prevMatch, team, delta);
       } catch (error) {
         console.error('Ошибка при изменении счета:', error);
         return prevMatch;
       }
     });
   }, []);
   ```

3. **Замените все методы аналогичным образом:**
   - ✅ `startSet()` → `SetService.startSet()`
   - ✅ `finishSet()` → `SetService.finishSet()`
   - ✅ `updateSet()` → `SetService.updateSet()`
   - ✅ `changeScore()` → `ScoreService.changeScore()`
   - ✅ `undoLastAction()` → `HistoryService.undoLastAction()`

**Чек-лист:**
- [ ] Все методы используют Service Layer
- [ ] Тесты написаны и проходят
- [ ] Функциональность сохранена
- [ ] JSDoc комментарии добавлены

---

#### 6.2. Обновление компонентов

**Инструкции:**

1. **Обновите компоненты для использования новых типов:**
   ```typescript
   // БЫЛО:
   import { Match } from '../../shared/types/Match.js';
   
   // СТАЛО:
   import { Match, SET_STATUS } from '../../shared/types/Match.js';
   ```

2. **Используйте типы из Domain Layer:**
   ```typescript
   import { SetDomain } from '../../shared/domain/SetDomain.js';
   
   const isCurrentSet = SetDomain.isCurrentSet(
     setNumber,
     match.currentSet
   );
   ```

3. **Обновите все компоненты:**
   - ✅ `SetEditModal.tsx`
   - ✅ `SetsDisplay.tsx`
   - ✅ `ScoreButtons.jsx`
   - ✅ `MatchControlPage.jsx`

**Чек-лист:**
- [ ] Все компоненты обновлены
- [ ] Используются типы из Domain Layer
- [ ] Тесты проходят
- [ ] UI работает корректно

---

## Этап 7: Интеграционные тесты

**Время:** 3-4 дня  
**Приоритет:** Важно

### Задачи

#### 7.1. Тесты основного приложения

**Файл:** `tests/integration/match-flow.test.ts`

**Инструкции:**

1. **Создайте интеграционные тесты:**
   ```typescript
   import { SetService } from '../../src/shared/services/SetService.js';
   import { ScoreService } from '../../src/shared/services/ScoreService.js';
   import { createNewMatch } from '../fixtures/matchFactory.js';
   
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

2. **Создайте тесты для всех сценариев:**
   - ✅ Полный цикл матча
   - ✅ Редактирование партий
   - ✅ Отмена действий
   - ✅ Возврат завершенной партии в игру

**Чек-лист:**
- [ ] Все сценарии покрыты тестами
- [ ] Тесты проходят
- [ ] Покрытие всех критических путей

---

#### 7.2. Тесты мобильного API

**Файл:** `tests/integration/mobile-api.test.ts`

**Инструкции:**

1. **Создайте тесты для мобильного API:**
   ```typescript
   import { MatchApiController } from '../../src/main/server/api/MatchApiController.js';
   import { createNewMatch } from '../fixtures/matchFactory.js';
   
   describe('Mobile API Integration', () => {
     it('должен обрабатывать изменение счета через API', () => {
       const match = createNewMatch();
       const result = MatchApiController.handleChangeScore(match, 'A', 1);
       
       expect(result.success).toBe(true);
       expect(result.data?.currentSet.scoreA).toBe(1);
     });
   });
   ```

2. **Создайте тесты синхронизации:**
   ```typescript
   describe('Mobile API Synchronization', () => {
     it('должен синхронизировать изменения между основным приложением и мобильным', () => {
       let mainMatch = createNewMatch();
       let mobileMatch = createNewMatch();
       
       // Изменение в мобильном интерфейсе
       const mobileResult = MatchApiController.handleChangeScore(
         mobileMatch,
         'A',
         1
       );
       mobileMatch = mobileResult.data!;
       
       // Синхронизация с основным приложением
       mainMatch = mobileMatch;
       
       // Проверка синхронизации
       expect(mainMatch.currentSet.scoreA).toBe(1);
       expect(mainMatch.updatedAt).toBe(mobileMatch.updatedAt);
     });
   });
   ```

**Чек-лист:**
- [ ] Все endpoints покрыты тестами
- [ ] Тесты синхронизации написаны
- [ ] Тесты проходят

---

## Этап 8: Документирование

**Время:** 2-3 дня  
**Приоритет:** Важно

### Задачи

#### 8.1. JSDoc комментарии

**Инструкции:**

1. **Добавьте JSDoc комментарии ко всем публичным методам:**
   ```typescript
   /**
    * Начинает новую партию
    * 
    * @param match - Текущий матч
    * @returns Новый матч с начатой партией
    * @throws {Error} Если партия уже начата или завершена
    * 
    * @example
    * ```typescript
    * const match = createNewMatch();
    * const newMatch = SetService.startSet(match);
    * expect(newMatch.currentSet.status).toBe(SET_STATUS.IN_PROGRESS);
    * ```
    */
   static startSet(match: Match): Match {
     // ...
   }
   ```

2. **Добавьте комментарии к классам:**
   ```typescript
   /**
    * Сервис для работы с партиями
    * 
    * Предоставляет методы для управления партиями матча:
    * - Начало партии
    * - Завершение партии
    * - Обновление партии
    * 
    * Все методы возвращают новый объект Match (immutability).
    * 
    * @example
    * ```typescript
    * const match = createNewMatch();
    * const newMatch = SetService.startSet(match);
    * ```
    */
   export class SetService {
     // ...
   }
   ```

**Чек-лист:**
- [ ] Все публичные методы имеют JSDoc
- [ ] Все классы имеют JSDoc
- [ ] Примеры использования добавлены
- [ ] Описаны параметры и возвращаемые значения

---

#### 8.2. Диаграммы

**Инструкции:**

1. **Создайте диаграммы состояний:**
   - Используйте Mermaid
   - Добавьте в документацию

2. **Создайте диаграммы потоков данных:**
   - Покажите поток от UI до Domain Layer
   - Покажите синхронизацию с мобильным API

3. **Создайте архитектурные диаграммы:**
   - Покажите слои архитектуры
   - Покажите зависимости между слоями

**Чек-лист:**
- [ ] Диаграммы состояний созданы
- [ ] Диаграммы потоков данных созданы
- [ ] Архитектурные диаграммы созданы
- [ ] Диаграммы добавлены в документацию

---

## Этап 9: Финальное тестирование

**Время:** 2-3 дня  
**Приоритет:** Критично

### Задачи

#### 9.1. Полное тестирование

**Инструкции:**

1. **Запустите все тесты:**
   ```bash
   npm test
   npm run test:coverage
   ```

2. **Проверьте покрытие:**
   - Domain Layer: > 90%
   - Service Layer: > 90%
   - Validator Layer: > 90%
   - API Layer: > 90%

3. **Ручное тестирование:**
   - ✅ Все функции работают
   - ✅ UI работает корректно
   - ✅ Мобильный интерфейс работает
   - ✅ Синхронизация работает

**Чек-лист:**
- [ ] Все тесты проходят
- [ ] Покрытие > 90%
- [ ] Ручное тестирование пройдено
- [ ] Нет регрессий

---

#### 9.2. Проверка производительности

**Инструкции:**

1. **Проверьте производительность:**
   - Время выполнения операций
   - Использование памяти
   - Отзывчивость UI

2. **Сравните с предыдущей версией:**
   - Нет деградации производительности
   - Улучшения, если есть

**Чек-лист:**
- [ ] Производительность проверена
- [ ] Нет деградации
- [ ] Метрики записаны

---

## Чек-листы и критерии готовности

### Общий чек-лист рефакторинга

- [ ] Все этапы выполнены
- [ ] Все тесты проходят
- [ ] Покрытие тестами > 90%
- [ ] TypeScript компилируется без ошибок
- [ ] JSDoc комментарии добавлены
- [ ] Документация обновлена
- [ ] Нет регрессий
- [ ] Производительность не ухудшилась
- [ ] Код соответствует стандартам

### Критерии готовности для каждого этапа

**Domain Layer:**
- [ ] Все методы реализованы
- [ ] Тесты написаны и проходят
- [ ] Покрытие > 90%
- [ ] JSDoc комментарии добавлены
- [ ] TypeScript компилируется без ошибок

**Service Layer:**
- [ ] Все методы реализованы
- [ ] Используется Domain Layer
- [ ] Используется Validator Layer
- [ ] Immutability соблюдена
- [ ] Тесты написаны и проходят
- [ ] Покрытие > 90%

**API Layer:**
- [ ] Все методы реализованы
- [ ] Используется Service Layer
- [ ] Валидация входных данных
- [ ] Обработка ошибок
- [ ] Тесты написаны и проходят
- [ ] Мобильный интерфейс работает

**UI Layer:**
- [ ] Все методы используют Service Layer
- [ ] Компоненты обновлены
- [ ] Тесты написаны и проходят
- [ ] UI работает корректно

---

## Типичные проблемы и решения

### Проблема 1: TypeScript ошибки компиляции

**Симптомы:**
- Ошибки типов при компиляции
- `Cannot find module` ошибки

**Решение:**
1. Проверьте пути импортов (используйте `.js` расширение)
2. Убедитесь, что все типы экспортированы
3. Проверьте `tsconfig.json` настройки

---

### Проблема 2: Тесты не проходят

**Симптомы:**
- Тесты падают с ошибками
- Неожиданное поведение

**Решение:**
1. Проверьте, что тестовые данные корректны
2. Убедитесь, что моки настроены правильно
3. Проверьте, что импорты корректны

---

### Проблема 3: Immutability нарушена

**Симптомы:**
- Изменения в одном месте влияют на другое
- Неожиданное поведение состояния

**Решение:**
1. Всегда создавайте новые объекты/массивы
2. Используйте spread оператор
3. Используйте `map`, `filter` вместо мутаций

---

### Проблема 4: Мобильный интерфейс не работает

**Симптомы:**
- API возвращает ошибки
- Синхронизация не работает

**Решение:**
1. Проверьте, что контроллер использует Service Layer
2. Убедитесь, что валидация работает
3. Проверьте IPC коммуникацию

---

### Проблема 5: Регрессии в функциональности

**Симптомы:**
- Что-то перестало работать
- Неожиданное поведение

**Решение:**
1. Сравните с предыдущей версией
2. Проверьте логи
3. Запустите интеграционные тесты
4. Откатите изменения, если нужно

---

## Полезные команды

```bash
# Запуск тестов
npm test

# Запуск тестов с покрытием
npm run test:coverage

# Запуск тестов в watch режиме
npm run test:watch

# Проверка TypeScript
npx tsc --noEmit

# Проверка линтера
npm run lint

# Сборка проекта
npm run build

# Запуск в dev режиме
npm run dev
```

---

## Контакты и поддержка

Если возникли вопросы или проблемы:
1. Проверьте документацию
2. Проверьте тесты
3. Обратитесь к плану рефакторинга
4. Создайте issue с описанием проблемы

---

**Дата создания:** 2025-01-XX  
**Версия:** 1.0
