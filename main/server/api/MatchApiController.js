import { SetService } from '../../../shared/services/SetService.js';
import { ScoreService } from '../../../shared/services/ScoreService.js';
import { HistoryService } from '../../../shared/services/HistoryService.js';
export class MatchApiController {
    static handleChangeScore(match, team, delta) {
        try {
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
            const newMatch = ScoreService.changeScore(match, team, delta);
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            };
        }
    }
    static handleStartSet(match) {
        try {
            const newMatch = SetService.startSet(match);
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            };
        }
    }
    static handleFinishSet(match) {
        try {
            const newMatch = SetService.finishSet(match);
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            };
        }
    }
    static handleChangeServingTeam(match, team) {
        try {
            if (team !== 'A' && team !== 'B') {
                return {
                    success: false,
                    error: 'Некорректная команда',
                };
            }
            const newMatch = ScoreService.changeServingTeam(match, team);
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            };
        }
    }
    static handleUndo(match) {
        try {
            const lastAction = HistoryService.undoLastAction();
            if (!lastAction || !lastAction.previousState) {
                return {
                    success: false,
                    error: 'Нет действий для отмены',
                };
            }
            const currentLogoA = match.teamA?.logoBase64 || match.teamA?.logo;
            const currentLogoB = match.teamB?.logoBase64 || match.teamB?.logo;
            const currentLogoPathA = match.teamA?.logoPath;
            const currentLogoPathB = match.teamB?.logoPath;
            const previousMatch = lastAction.previousState;
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            };
        }
    }
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
