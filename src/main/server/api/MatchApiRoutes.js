/**
 * API маршруты для мобильного интерфейса
 * Определение HTTP маршрутов с использованием MatchApiController
 */

import { MatchApiController } from './MatchApiController.js';

/**
 * Настройка маршрутов API для мобильного интерфейса
 * 
 * @param {import('express').Express} app - Express приложение
 * @param {Object} server - Экземпляр MobileServer с методами валидации и управления матчем
 */
export function setupApiRoutes(app, server) {
  /**
   * GET /api/match/:sessionId
   * Получение текущего матча
   */
  app.get('/api/match/:sessionId', (req, res) => {
    try {
      const sessionId = Array.isArray(req.params.sessionId)
        ? req.params.sessionId[0]
        : req.params.sessionId;

      if (!server.validateSession(sessionId)) {
        return res.status(403).json({ error: 'Неверная или истекшая сессия' });
      }

      const result = MatchApiController.handleGetMatch(server.currentMatch);

      if (!result.success) {
        return res.status(404).json({ error: result.error });
      }

      // Для обратной совместимости возвращаем просто match (без обертки)
      res.json(result.data);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  });

  /**
   * POST /api/match/:sessionId/score
   * Изменение счета команды
   */
  app.post('/api/match/:sessionId/score', (req, res) => {
    try {
      const sessionId = Array.isArray(req.params.sessionId)
        ? req.params.sessionId[0]
        : req.params.sessionId;
      const { team, delta } = req.body;

      if (!server.validateSession(sessionId)) {
        return res.status(403).json({ error: 'Неверная или истекшая сессия' });
      }

      if (!server.currentMatch) {
        return res.status(404).json({ error: 'Матч не найден' });
      }

      // Используем контроллер
      const result = MatchApiController.handleChangeScore(
        server.currentMatch,
        team,
        delta
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Обновляем match
      server.currentMatch = result.data;

      // Уведомляем основное приложение
      if (server.onMatchUpdate) {
        server.onMatchUpdate(server.currentMatch);
      }

      res.json({ success: true, match: server.currentMatch });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  });

  /**
   * POST /api/match/:sessionId/set/start
   * Начало партии
   */
  app.post('/api/match/:sessionId/set/start', (req, res) => {
    try {
      const sessionId = Array.isArray(req.params.sessionId)
        ? req.params.sessionId[0]
        : req.params.sessionId;

      if (!server.validateSession(sessionId)) {
        return res.status(403).json({ error: 'Неверная или истекшая сессия' });
      }

      if (!server.currentMatch) {
        return res.status(404).json({ error: 'Матч не найден' });
      }

      // Используем контроллер
      const result = MatchApiController.handleStartSet(server.currentMatch);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Обновляем match
      server.currentMatch = result.data;

      // Уведомляем основное приложение
      if (server.onMatchUpdate) {
        server.onMatchUpdate(server.currentMatch);
      }

      res.json({ success: true, match: server.currentMatch });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  });

  /**
   * POST /api/match/:sessionId/set
   * Завершение партии
   */
  app.post('/api/match/:sessionId/set', (req, res) => {
    try {
      const sessionId = Array.isArray(req.params.sessionId)
        ? req.params.sessionId[0]
        : req.params.sessionId;

      if (!server.validateSession(sessionId)) {
        return res.status(403).json({ error: 'Неверная или истекшая сессия' });
      }

      if (!server.currentMatch) {
        return res.status(404).json({ error: 'Матч не найден' });
      }

      // Используем контроллер
      const result = MatchApiController.handleFinishSet(server.currentMatch);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Обновляем match
      server.currentMatch = result.data;

      // Уведомляем основное приложение
      if (server.onMatchUpdate) {
        server.onMatchUpdate(server.currentMatch);
      }

      res.json({ success: true, match: server.currentMatch });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  });

  /**
   * POST /api/match/:sessionId/serve
   * Изменение команды подачи
   */
  app.post('/api/match/:sessionId/serve', (req, res) => {
    try {
      const sessionId = Array.isArray(req.params.sessionId)
        ? req.params.sessionId[0]
        : req.params.sessionId;
      const { team } = req.body;

      if (!server.validateSession(sessionId)) {
        return res.status(403).json({ error: 'Неверная или истекшая сессия' });
      }

      if (!server.currentMatch) {
        return res.status(404).json({ error: 'Матч не найден' });
      }

      // Используем контроллер
      const result = MatchApiController.handleChangeServingTeam(
        server.currentMatch,
        team
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Обновляем match
      server.currentMatch = result.data;

      // Уведомляем основное приложение
      if (server.onMatchUpdate) {
        server.onMatchUpdate(server.currentMatch);
      }

      res.json({ success: true, match: server.currentMatch });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  });

  /**
   * POST /api/match/:sessionId/undo
   * Отмена последнего действия
   */
  app.post('/api/match/:sessionId/undo', (req, res) => {
    try {
      const sessionId = Array.isArray(req.params.sessionId)
        ? req.params.sessionId[0]
        : req.params.sessionId;

      if (!server.validateSession(sessionId)) {
        return res.status(403).json({ error: 'Неверная или истекшая сессия' });
      }

      if (!server.currentMatch) {
        return res.status(404).json({ error: 'Матч не найден' });
      }

      // Используем контроллер
      const result = MatchApiController.handleUndo(server.currentMatch);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Обновляем match
      server.currentMatch = result.data;

      // Уведомляем основное приложение
      if (server.onMatchUpdate) {
        server.onMatchUpdate(server.currentMatch);
      }

      res.json({ success: true, match: server.currentMatch });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      });
    }
  });
}
