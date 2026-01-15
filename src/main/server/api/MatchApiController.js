/**
 * API контроллер для мобильного интерфейса
 * Обработка HTTP запросов от мобильного интерфейса
 * Использует Service Layer для выполнения операций
 */

import { SetService } from '../../../shared/services/SetService.ts';
import { ScoreService } from '../../../shared/services/ScoreService.ts';
import { HistoryService } from '../../../shared/services/HistoryService.ts';

/**
 * Ответ API
 */
export class MatchApiController {
  /**
   * Обрабатывает запрос на изменение счета
   * 
   * @param {Object} match - Текущий матч
   * @param {string} team - Команда ('A' или 'B')
   * @param {number} delta - Изменение счета (+1 или -1)
   * @returns {Object} Результат операции
   */
  static handleChangeScore(match, team, delta) {
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
          error: 'Некорректное изменение счета. Ожидается +1 или -1',
        };
      }

      // Используем Service Layer
      const newMatch = ScoreService.changeScore(match, team, delta);

      // Добавляем в историю
      HistoryService.addAction({
        type: 'score_change',
        timestamp: Date.now(),
        data: { team, delta },
        previousState: match,
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
   * 
   * @param {Object} match - Текущий матч
   * @returns {Object} Результат операции
   */
  static handleStartSet(match) {
    try {
      // Используем Service Layer
      const newMatch = SetService.startSet(match);

      // Добавляем в историю
      HistoryService.addAction({
        type: 'start_set',
        timestamp: Date.now(),
        data: {},
        previousState: match,
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
   * 
   * @param {Object} match - Текущий матч
   * @returns {Object} Результат операции
   */
  static handleFinishSet(match) {
    try {
      // Используем Service Layer
      const newMatch = SetService.finishSet(match);

      // Добавляем в историю
      HistoryService.addAction({
        type: 'finish_set',
        timestamp: Date.now(),
        data: {},
        previousState: match,
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
   * Обрабатывает запрос на изменение команды подачи
   * 
   * @param {Object} match - Текущий матч
   * @param {string} team - Команда, которой передается подача ('A' или 'B')
   * @returns {Object} Результат операции
   */
  static handleChangeServingTeam(match, team) {
    try {
      // Валидация входных данных
      if (team !== 'A' && team !== 'B') {
        return {
          success: false,
          error: 'Некорректная команда',
        };
      }

      // Используем Service Layer
      const newMatch = ScoreService.changeServingTeam(match, team);

      // Добавляем в историю только если произошло изменение
      if (newMatch !== match) {
        HistoryService.addAction({
          type: 'serve_change',
          timestamp: Date.now(),
          data: { team },
          previousState: match,
        });
      }

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
   * Обрабатывает запрос на отмену последнего действия
   * 
   * @param {Object} match - Текущий матч
   * @returns {Object} Результат операции
   */
  static handleUndo(match) {
    try {
      // Получаем последнее действие из истории
      const lastAction = HistoryService.undoLastAction();

      if (!lastAction || !lastAction.previousState) {
        return {
          success: false,
          error: 'Нет действий для отмены',
        };
      }

      // Восстанавливаем предыдущее состояние
      // Сохраняем текущие логотипы (они не должны меняться при отмене)
      const currentLogoA = match.teamA?.logo || match.teamA?.logoBase64;
      const currentLogoB = match.teamB?.logo || match.teamB?.logoBase64;
      const currentLogoPathA = match.teamA?.logoPath;
      const currentLogoPathB = match.teamB?.logoPath;

      const previousMatch = lastAction.previousState;

      // Восстанавливаем логотипы из текущего состояния (они не меняются при отмене)
      if (previousMatch.teamA) {
        if (currentLogoA) {
          previousMatch.teamA.logo = currentLogoA;
          previousMatch.teamA.logoBase64 = currentLogoA;
        }
        if (currentLogoPathA) {
          previousMatch.teamA.logoPath = currentLogoPathA;
        }
      }
      if (previousMatch.teamB) {
        if (currentLogoB) {
          previousMatch.teamB.logo = currentLogoB;
          previousMatch.teamB.logoBase64 = currentLogoB;
        }
        if (currentLogoPathB) {
          previousMatch.teamB.logoPath = currentLogoPathB;
        }
      }

      previousMatch.updatedAt = new Date().toISOString();

      return {
        success: true,
        data: previousMatch,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      };
    }
  }

  /**
   * Обрабатывает запрос на получение текущего матча
   * 
   * @param {Object|null} match - Текущий матч
   * @returns {Object} Результат операции
   */
  static handleGetMatch(match) {
    if (!match) {
      return {
        success: false,
        error: 'Матч не найден',
      };
    }

    return {
      success: true,
      data: match,
    };
  }
}
