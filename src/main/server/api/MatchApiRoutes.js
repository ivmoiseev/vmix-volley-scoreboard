import { MatchApiController } from './MatchApiController.js';
export function setupApiRoutes(app, server) {
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
            res.json(result.data);
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            });
        }
    });
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
            const result = MatchApiController.handleChangeScore(server.currentMatch, team, delta);
            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }
            server.currentMatch = result.data;
            if (server.onMatchUpdate) {
                server.onMatchUpdate(server.currentMatch);
            }
            res.json({ success: true, match: server.currentMatch });
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            });
        }
    });
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
            const result = MatchApiController.handleStartSet(server.currentMatch);
            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }
            server.currentMatch = result.data;
            if (server.onMatchUpdate) {
                server.onMatchUpdate(server.currentMatch);
            }
            res.json({ success: true, match: server.currentMatch });
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            });
        }
    });
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
            const result = MatchApiController.handleFinishSet(server.currentMatch);
            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }
            server.currentMatch = result.data;
            if (server.onMatchUpdate) {
                server.onMatchUpdate(server.currentMatch);
            }
            res.json({ success: true, match: server.currentMatch });
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            });
        }
    });
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
            const result = MatchApiController.handleChangeServingTeam(server.currentMatch, team);
            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }
            server.currentMatch = result.data;
            if (server.onMatchUpdate) {
                server.onMatchUpdate(server.currentMatch);
            }
            res.json({ success: true, match: server.currentMatch });
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            });
        }
    });
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
            const result = MatchApiController.handleUndo(server.currentMatch);
            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }
            server.currentMatch = result.data;
            if (server.onMatchUpdate) {
                server.onMatchUpdate(server.currentMatch);
            }
            res.json({ success: true, match: server.currentMatch });
        }
        catch (error) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            });
        }
    });
}
