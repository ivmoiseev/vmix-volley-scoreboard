import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMatch } from "../hooks/useMatch.js";
import { useVMix } from "../hooks/useVMix";
import ScoreDisplay from "../components/ScoreDisplay";
import { getContrastTextColor } from "../utils/colorContrast";
import SetsDisplay from "../components/SetsDisplay";
import ServeControl from "../components/ServeControl";
import ScoreButtons from "../components/ScoreButtons";
import VMixOverlayButtons from "../components/VMixOverlayButtons";
import SetEditModal from "../components/SetEditModal";
import { SET_STATUS } from "../../shared/types/Match";
import { SetDomain } from "../../shared/domain/SetDomain.js";
function MatchControlPage({ match: initialMatch, onMatchChange }) {
    const navigate = useNavigate();
    const location = useLocation();
    const matchFromState = location.state?.match;
    const effectiveInitialMatch = initialMatch || matchFromState;
    const formatDate = (dateStr) => {
        if (!dateStr)
            return "Не указана";
        try {
            const [year, month, day] = dateStr.split("-");
            if (!year || !month || !day)
                return dateStr;
            return `${day}.${month}.${year}`;
        }
        catch (error) {
            console.error("Ошибка при форматировании даты:", error);
            return dateStr || "Не указана";
        }
    };
    const previousMatchIdRef = useRef(null);
    const isFirstLoadRef = useRef(true);
    const forceUpdateFromState = location.state?.forceUpdateVMix || false;
    const [editingSetNumber, setEditingSetNumber] = useState(null);
    const { match, setMatch, changeScore, changeServingTeam, finishSet, startSet, toggleSetStatus, updateSet, changeStatistics, toggleStatistics, undoLastAction, isSetballNow, setballTeam, isMatchballNow, matchballTeam, canFinish, hasHistory, currentSetStatus, } = useMatch(effectiveInitialMatch);
    const { vmixConfig, connectionStatus, overlayStates, updateMatchData, showOverlay, hideOverlay, isOverlayActive, updateCoachData, updateReferee1Data, updateReferee2ShowData, } = useVMix(match);
    const modalData = useMemo(() => {
        if (!editingSetNumber || !match)
            return null;
        const completedSet = match.sets.find(s => s.setNumber === editingSetNumber);
        const setToEdit = completedSet || (editingSetNumber === match.currentSet.setNumber ? match.currentSet : null);
        const isCurrentSet = setToEdit && !completedSet && SetDomain.isCurrentSet(editingSetNumber, match.currentSet);
        if (!setToEdit) {
            return null;
        }
        return { setToEdit, isCurrentSet };
    }, [editingSetNumber, match?.currentSet?.setNumber, match?.sets]);
    const handleSetSave = useCallback((updates) => {
        if (!editingSetNumber || !match)
            return false;
        const wasCompletedSet = match.sets.find(s => s.setNumber === editingSetNumber);
        const success = updateSet(editingSetNumber, updates);
        if (success) {
            setEditingSetNumber(null);
            if (updates.status === SET_STATUS.IN_PROGRESS && wasCompletedSet) {
                console.log('[MatchControlPage] Партия возвращена в игру, ожидаем автоматического обновления vMix через useEffect');
            }
        }
        return success;
    }, [editingSetNumber, match, updateSet]);
    useEffect(() => {
        if (matchFromState && !initialMatch) {
            if (onMatchChange) {
                onMatchChange(matchFromState);
            }
            window.history.replaceState({}, document.title);
        }
    }, [matchFromState, initialMatch, onMatchChange]);
    useEffect(() => {
        if (!effectiveInitialMatch && !match) {
            const timer = setTimeout(() => {
                if (!match && !location.state?.match) {
                    navigate("/");
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [match, effectiveInitialMatch, navigate, location.state]);
    useEffect(() => {
        if (match && connectionStatus.connected) {
            const currentMatchId = match.matchId;
            const isNewMatch = previousMatchIdRef.current !== currentMatchId;
            const forceUpdate = isFirstLoadRef.current || isNewMatch || forceUpdateFromState;
            if (isNewMatch) {
                previousMatchIdRef.current = currentMatchId;
                isFirstLoadRef.current = false;
            }
            console.log("[MatchControlPage] Вызов updateMatchData для обновления vMix:", {
                matchId: match.matchId,
                teamA: match.teamA?.name,
                teamB: match.teamB?.name,
                hasLogoA: !!match.teamA?.logo,
                hasLogoB: !!match.teamB?.logo,
                forceUpdate,
                isNewMatch,
            });
            updateMatchData(match, forceUpdate);
            if (forceUpdateFromState) {
                window.history.replaceState({}, document.title);
            }
        }
        else {
            if (match && !connectionStatus.connected) {
                console.log("[MatchControlPage] Обновление vMix пропущено (vMix не подключен):", {
                    hasMatch: !!match,
                    vMixConnected: connectionStatus.connected,
                    message: connectionStatus.message || "Не подключено",
                });
            }
            if (!match) {
                previousMatchIdRef.current = null;
                isFirstLoadRef.current = true;
            }
        }
    }, [
        match,
        connectionStatus.connected,
        updateMatchData,
        forceUpdateFromState,
    ]);
    useEffect(() => {
        if (onMatchChange && match) {
            onMatchChange(match);
        }
    }, [match, onMatchChange]);
    useEffect(() => {
        if (match && window.electronAPI) {
            window.electronAPI.setMobileMatch(match);
            window.electronAPI.setCurrentMatch(match);
        }
    }, [match]);
    useEffect(() => {
        if (match &&
            match.currentSet &&
            window.electronAPI &&
            window.electronAPI.setMobileMatch) {
            const timeoutId = setTimeout(() => {
                window.electronAPI.setMobileMatch(match).catch((err) => {
                    console.error("Ошибка при синхронизации матча с мобильным сервером:", err);
                });
            }, 0);
            return () => clearTimeout(timeoutId);
        }
    }, [match?.currentSet?.servingTeam]);
    useEffect(() => {
        if (match &&
            match.currentSet &&
            connectionStatus.connected) {
            console.log("[MatchControlPage] Обновление видимости полей при изменении подачи:", {
                servingTeam: match.currentSet.servingTeam,
            });
            updateMatchData(match, false);
        }
    }, [match?.currentSet?.servingTeam, connectionStatus.connected, updateMatchData]);
    useEffect(() => {
        if (!window.electronAPI)
            return;
        const handleLoadMatch = (updatedMatch) => {
            if (updatedMatch) {
                const isNewMatch = previousMatchIdRef.current !== updatedMatch.matchId;
                if (isNewMatch) {
                    previousMatchIdRef.current = null;
                    isFirstLoadRef.current = true;
                }
                setMatch(updatedMatch);
                if (onMatchChange) {
                    onMatchChange(updatedMatch);
                }
            }
        };
        const removeLoadMatch = window.electronAPI.onLoadMatch?.(handleLoadMatch);
        return () => {
            removeLoadMatch?.();
        };
    }, [setMatch, onMatchChange]);
    useEffect(() => {
        if (!window.electronAPI)
            return;
        const handleMatchSaved = () => {
            if (window.electronAPI.markMatchSaved) {
                window.electronAPI.markMatchSaved();
            }
        };
        const removeMatchSaved = window.electronAPI.onMatchSaved?.(handleMatchSaved);
        return () => {
            removeMatchSaved?.();
        };
    }, []);
    if (!initialMatch || !match) {
        return (_jsxs("div", { style: { padding: "2rem", textAlign: "center" }, children: [_jsx("h2", { children: "\u041C\u0430\u0442\u0447 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D" }), _jsx("p", { children: "\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0441\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043D\u043E\u0432\u044B\u0439 \u043C\u0430\u0442\u0447 \u0438\u043B\u0438 \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0439." }), _jsx("button", { onClick: () => navigate("/"), style: {
                        padding: "0.75rem 1.5rem",
                        fontSize: "1rem",
                        backgroundColor: "#3498db",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        marginTop: "1rem",
                    }, children: "\u0412\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F \u043D\u0430 \u0433\u043B\u0430\u0432\u043D\u0443\u044E" })] }));
    }
    const handleFinishSet = () => {
        if (!canFinish) {
            const threshold = match?.currentSet?.setNumber === 5 ? 15 : 25;
            alert(`Партия не может быть завершена. Необходимо набрать ${threshold} очков с разницей минимум 2 очка.`);
            return;
        }
        if (window.confirm("Завершить текущую партию?")) {
            finishSet();
        }
    };
    return (_jsxs("div", { style: { padding: "1rem", maxWidth: "1600px", margin: "0 auto" }, children: [_jsxs("div", { style: {
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)",
                    gap: "1rem",
                    alignItems: "start",
                }, children: [_jsxs("div", { children: [_jsx("div", { style: {
                                    backgroundColor: "#ecf0f1",
                                    padding: "1rem",
                                    borderRadius: "4px",
                                    marginBottom: "1rem",
                                }, children: _jsxs("div", { style: { display: "flex", gap: "2rem", flexWrap: "wrap" }, children: [_jsxs("div", { children: [_jsx("strong", { children: "\u0422\u0443\u0440\u043D\u0438\u0440:" }), " ", match.tournament || "Не указан"] }), _jsxs("div", { children: [_jsx("strong", { children: "\u041C\u0435\u0441\u0442\u043E:" }), " ", match.venue || "Не указано"] }), _jsxs("div", { children: [_jsx("strong", { children: "\u0414\u0430\u0442\u0430:" }), " ", formatDate(match.date)] }), _jsxs("div", { children: [_jsx("strong", { children: "\u0412\u0440\u0435\u043C\u044F:" }), " ", match.time || "Не указано"] })] }) }), _jsxs("div", { style: {
                                    display: "grid",
                                    gridTemplateColumns: "1fr 1fr",
                                    gap: "1rem",
                                    marginBottom: "1rem",
                                }, children: [_jsxs("div", { style: {
                                            backgroundColor: match.teamA.color || "#3498db",
                                            color: getContrastTextColor(match.teamA.color || "#3498db"),
                                            padding: "1rem",
                                            borderRadius: "4px",
                                            textAlign: "center",
                                        }, children: [_jsx("h3", { style: { marginTop: 0 }, children: match.teamA.name }), match.teamA.coach && _jsxs("p", { children: ["\u0422\u0440\u0435\u043D\u0435\u0440: ", match.teamA.coach] })] }), _jsxs("div", { style: {
                                            backgroundColor: match.teamB.color || "#e74c3c",
                                            color: getContrastTextColor(match.teamB.color || "#e74c3c"),
                                            padding: "1rem",
                                            borderRadius: "4px",
                                            textAlign: "center",
                                        }, children: [_jsx("h3", { style: { marginTop: 0 }, children: match.teamB.name }), match.teamB.coach && _jsxs("p", { children: ["\u0422\u0440\u0435\u043D\u0435\u0440: ", match.teamB.coach] })] })] }), _jsx(SetsDisplay, { sets: match.sets, currentSet: match.currentSet, onSetClick: (setNumber) => setEditingSetNumber(setNumber) }), _jsxs("div", { style: {
                                    backgroundColor: "#fff",
                                    border: "2px solid #3498db",
                                    borderRadius: "4px",
                                    padding: "1rem",
                                    marginBottom: "1rem",
                                }, children: [_jsxs("h3", { style: { textAlign: "center", marginTop: 0 }, children: ["\u041F\u0430\u0440\u0442\u0438\u044F #", match.currentSet.setNumber, currentSetStatus === SET_STATUS.PENDING &&
                                                match.sets.some(s => s.setNumber === match.currentSet.setNumber && s.status === SET_STATUS.COMPLETED)
                                                ? " - завершена"
                                                : ""] }), _jsx(ScoreDisplay, { teamA: match.teamA.name, teamB: match.teamB.name, scoreA: match.currentSet.scoreA, scoreB: match.currentSet.scoreB, servingTeam: match.currentSet.servingTeam, isSetball: isSetballNow, setballTeam: setballTeam, isMatchball: isMatchballNow, matchballTeam: matchballTeam, teamALogo: match.teamA.logo, teamBLogo: match.teamB.logo }), _jsx(ServeControl, { servingTeam: match.currentSet.servingTeam, teamAName: match.teamA.name, teamBName: match.teamB.name, onChange: changeServingTeam })] }), _jsx(ScoreButtons, { teamAName: match.teamA.name, teamBName: match.teamB.name, onScoreChange: changeScore, disabled: currentSetStatus !== SET_STATUS.IN_PROGRESS }), _jsxs("div", { style: {
                                    display: "flex",
                                    gap: "1rem",
                                    justifyContent: "center",
                                    marginBottom: "1rem",
                                }, children: [_jsx("button", { onClick: toggleSetStatus, disabled: currentSetStatus === SET_STATUS.IN_PROGRESS && !canFinish, style: {
                                            padding: "0.75rem 1.5rem",
                                            fontSize: "1rem",
                                            backgroundColor: currentSetStatus === SET_STATUS.PENDING
                                                ? "#3498db"
                                                : (canFinish ? "#27ae60" : "#95a5a6"),
                                            color: "white",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: (currentSetStatus === SET_STATUS.IN_PROGRESS && !canFinish)
                                                ? "not-allowed"
                                                : "pointer",
                                            fontWeight: "bold",
                                            opacity: (currentSetStatus === SET_STATUS.IN_PROGRESS && !canFinish) ? 0.6 : 1,
                                        }, children: currentSetStatus === SET_STATUS.PENDING
                                            ? "Начать партию"
                                            : "Завершить партию" }), _jsx("button", { onClick: undoLastAction, disabled: !hasHistory || currentSetStatus !== SET_STATUS.IN_PROGRESS, style: {
                                            padding: "0.75rem 1.5rem",
                                            fontSize: "1rem",
                                            backgroundColor: (hasHistory && currentSetStatus === SET_STATUS.IN_PROGRESS) ? "#e74c3c" : "#95a5a6",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: hasHistory ? "pointer" : "not-allowed",
                                        }, children: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0435\u0435 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435" })] }), _jsxs("div", { style: {
                                    backgroundColor: "#ecf0f1",
                                    padding: "1rem",
                                    borderRadius: "4px",
                                    marginBottom: "1rem",
                                }, children: [_jsx("div", { style: {
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "1rem",
                                            marginBottom: match.statistics.enabled ? "1rem" : 0,
                                        }, children: _jsxs("label", { style: {
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.5rem",
                                                cursor: "pointer",
                                            }, children: [_jsx("input", { type: "checkbox", checked: match.statistics.enabled, onChange: (e) => toggleStatistics(e.target.checked) }), _jsx("span", { children: "\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u0430\u044F \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430" })] }) }), match.statistics.enabled && (_jsx("div", { children: _jsxs("div", { style: {
                                                display: "grid",
                                                gridTemplateColumns: "1fr 1fr",
                                                gap: "1rem",
                                                marginBottom: "1rem",
                                            }, children: [_jsxs("div", { children: [_jsx("h4", { children: match.teamA.name }), _jsxs("div", { style: {
                                                                display: "grid",
                                                                gridTemplateColumns: "1fr 1fr",
                                                                gap: "0.5rem",
                                                            }, children: [_jsxs("div", { children: [_jsxs("div", { style: {
                                                                                display: "flex",
                                                                                gap: "0.25rem",
                                                                                marginBottom: "0.25rem",
                                                                            }, children: [_jsx("button", { onClick: (e) => changeStatistics("A", "attack", -1, e), style: {
                                                                                        flex: 1,
                                                                                        padding: "0.5rem",
                                                                                        backgroundColor: "#e74c3c",
                                                                                        color: "white",
                                                                                        border: "none",
                                                                                        borderRadius: "4px",
                                                                                        cursor: "pointer",
                                                                                    }, children: "-1" }), _jsx("button", { onClick: (e) => changeStatistics("A", "attack", 1, e), style: {
                                                                                        flex: 1,
                                                                                        padding: "0.5rem",
                                                                                        backgroundColor: "#27ae60",
                                                                                        color: "white",
                                                                                        border: "none",
                                                                                        borderRadius: "4px",
                                                                                        cursor: "pointer",
                                                                                    }, children: "+1" })] }), _jsxs("div", { style: { textAlign: "center", fontWeight: "bold" }, children: ["\u0410\u0442\u0430\u043A\u0430: ", match.statistics.teamA.attack] })] }), _jsxs("div", { children: [_jsxs("div", { style: {
                                                                                display: "flex",
                                                                                gap: "0.25rem",
                                                                                marginBottom: "0.25rem",
                                                                            }, children: [_jsx("button", { onClick: (e) => changeStatistics("A", "block", -1, e), style: {
                                                                                        flex: 1,
                                                                                        padding: "0.5rem",
                                                                                        backgroundColor: "#e74c3c",
                                                                                        color: "white",
                                                                                        border: "none",
                                                                                        borderRadius: "4px",
                                                                                        cursor: "pointer",
                                                                                    }, children: "-1" }), _jsx("button", { onClick: (e) => changeStatistics("A", "block", 1, e), style: {
                                                                                        flex: 1,
                                                                                        padding: "0.5rem",
                                                                                        backgroundColor: "#27ae60",
                                                                                        color: "white",
                                                                                        border: "none",
                                                                                        borderRadius: "4px",
                                                                                        cursor: "pointer",
                                                                                    }, children: "+1" })] }), _jsxs("div", { style: { textAlign: "center", fontWeight: "bold" }, children: ["\u0411\u043B\u043E\u043A: ", match.statistics.teamA.block] })] }), _jsxs("div", { children: [_jsxs("div", { style: {
                                                                                display: "flex",
                                                                                gap: "0.25rem",
                                                                                marginBottom: "0.25rem",
                                                                            }, children: [_jsx("button", { onClick: (e) => changeStatistics("A", "serve", -1, e), style: {
                                                                                        flex: 1,
                                                                                        padding: "0.5rem",
                                                                                        backgroundColor: "#e74c3c",
                                                                                        color: "white",
                                                                                        border: "none",
                                                                                        borderRadius: "4px",
                                                                                        cursor: "pointer",
                                                                                    }, children: "-1" }), _jsx("button", { onClick: (e) => changeStatistics("A", "serve", 1, e), style: {
                                                                                        flex: 1,
                                                                                        padding: "0.5rem",
                                                                                        backgroundColor: "#27ae60",
                                                                                        color: "white",
                                                                                        border: "none",
                                                                                        borderRadius: "4px",
                                                                                        cursor: "pointer",
                                                                                    }, children: "+1" })] }), _jsxs("div", { style: { textAlign: "center", fontWeight: "bold" }, children: ["\u041F\u043E\u0434\u0430\u0447\u0438: ", match.statistics.teamA.serve] })] }), _jsxs("div", { children: [_jsxs("div", { style: {
                                                                                display: "flex",
                                                                                gap: "0.25rem",
                                                                                marginBottom: "0.25rem",
                                                                            }, children: [_jsx("button", { onClick: (e) => changeStatistics("A", "opponentErrors", -1, e), style: {
                                                                                        flex: 1,
                                                                                        padding: "0.5rem",
                                                                                        backgroundColor: "#e74c3c",
                                                                                        color: "white",
                                                                                        border: "none",
                                                                                        borderRadius: "4px",
                                                                                        cursor: "pointer",
                                                                                    }, children: "-1" }), _jsx("button", { onClick: (e) => changeStatistics("A", "opponentErrors", 1, e), style: {
                                                                                        flex: 1,
                                                                                        padding: "0.5rem",
                                                                                        backgroundColor: "#27ae60",
                                                                                        color: "white",
                                                                                        border: "none",
                                                                                        borderRadius: "4px",
                                                                                        cursor: "pointer",
                                                                                    }, children: "+1" })] }), _jsxs("div", { style: { textAlign: "center", fontWeight: "bold" }, children: ["\u041E\u0448\u0438\u0431\u043A\u0438 \u0441\u043E\u043F\u0435\u0440\u043D\u0438\u043A\u0430:", " ", match.statistics.teamA.opponentErrors] })] })] })] }), _jsxs("div", { children: [_jsx("h4", { children: match.teamB.name }), _jsxs("div", { style: {
                                                                display: "grid",
                                                                gridTemplateColumns: "1fr 1fr",
                                                                gap: "0.5rem",
                                                            }, children: [_jsxs("div", { children: [_jsxs("div", { style: {
                                                                                display: "flex",
                                                                                gap: "0.25rem",
                                                                                marginBottom: "0.25rem",
                                                                            }, children: [_jsx("button", { onClick: (e) => changeStatistics("B", "attack", -1, e), style: {
                                                                                        flex: 1,
                                                                                        padding: "0.5rem",
                                                                                        backgroundColor: "#e74c3c",
                                                                                        color: "white",
                                                                                        border: "none",
                                                                                        borderRadius: "4px",
                                                                                        cursor: "pointer",
                                                                                    }, children: "-1" }), _jsx("button", { onClick: (e) => changeStatistics("B", "attack", 1, e), style: {
                                                                                        flex: 1,
                                                                                        padding: "0.5rem",
                                                                                        backgroundColor: "#27ae60",
                                                                                        color: "white",
                                                                                        border: "none",
                                                                                        borderRadius: "4px",
                                                                                        cursor: "pointer",
                                                                                    }, children: "+1" })] }), _jsxs("div", { style: { textAlign: "center", fontWeight: "bold" }, children: ["\u0410\u0442\u0430\u043A\u0430: ", match.statistics.teamB.attack] })] }), _jsxs("div", { children: [_jsxs("div", { style: {
                                                                                display: "flex",
                                                                                gap: "0.25rem",
                                                                                marginBottom: "0.25rem",
                                                                            }, children: [_jsx("button", { onClick: (e) => changeStatistics("B", "block", -1, e), style: {
                                                                                        flex: 1,
                                                                                        padding: "0.5rem",
                                                                                        backgroundColor: "#e74c3c",
                                                                                        color: "white",
                                                                                        border: "none",
                                                                                        borderRadius: "4px",
                                                                                        cursor: "pointer",
                                                                                    }, children: "-1" }), _jsx("button", { onClick: (e) => changeStatistics("B", "block", 1, e), style: {
                                                                                        flex: 1,
                                                                                        padding: "0.5rem",
                                                                                        backgroundColor: "#27ae60",
                                                                                        color: "white",
                                                                                        border: "none",
                                                                                        borderRadius: "4px",
                                                                                        cursor: "pointer",
                                                                                    }, children: "+1" })] }), _jsxs("div", { style: { textAlign: "center", fontWeight: "bold" }, children: ["\u0411\u043B\u043E\u043A: ", match.statistics.teamB.block] })] }), _jsxs("div", { children: [_jsxs("div", { style: {
                                                                                display: "flex",
                                                                                gap: "0.25rem",
                                                                                marginBottom: "0.25rem",
                                                                            }, children: [_jsx("button", { onClick: (e) => changeStatistics("B", "serve", -1, e), style: {
                                                                                        flex: 1,
                                                                                        padding: "0.5rem",
                                                                                        backgroundColor: "#e74c3c",
                                                                                        color: "white",
                                                                                        border: "none",
                                                                                        borderRadius: "4px",
                                                                                        cursor: "pointer",
                                                                                    }, children: "-1" }), _jsx("button", { onClick: (e) => changeStatistics("B", "serve", 1, e), style: {
                                                                                        flex: 1,
                                                                                        padding: "0.5rem",
                                                                                        backgroundColor: "#27ae60",
                                                                                        color: "white",
                                                                                        border: "none",
                                                                                        borderRadius: "4px",
                                                                                        cursor: "pointer",
                                                                                    }, children: "+1" })] }), _jsxs("div", { style: { textAlign: "center", fontWeight: "bold" }, children: ["\u041F\u043E\u0434\u0430\u0447\u0438: ", match.statistics.teamB.serve] })] }), _jsxs("div", { children: [_jsxs("div", { style: {
                                                                                display: "flex",
                                                                                gap: "0.25rem",
                                                                                marginBottom: "0.25rem",
                                                                            }, children: [_jsx("button", { onClick: (e) => changeStatistics("B", "opponentErrors", -1, e), style: {
                                                                                        flex: 1,
                                                                                        padding: "0.5rem",
                                                                                        backgroundColor: "#e74c3c",
                                                                                        color: "white",
                                                                                        border: "none",
                                                                                        borderRadius: "4px",
                                                                                        cursor: "pointer",
                                                                                    }, children: "-1" }), _jsx("button", { onClick: (e) => changeStatistics("B", "opponentErrors", 1, e), style: {
                                                                                        flex: 1,
                                                                                        padding: "0.5rem",
                                                                                        backgroundColor: "#27ae60",
                                                                                        color: "white",
                                                                                        border: "none",
                                                                                        borderRadius: "4px",
                                                                                        cursor: "pointer",
                                                                                    }, children: "+1" })] }), _jsxs("div", { style: { textAlign: "center", fontWeight: "bold" }, children: ["\u041E\u0448\u0438\u0431\u043A\u0438 \u0441\u043E\u043F\u0435\u0440\u043D\u0438\u043A\u0430:", " ", match.statistics.teamB.opponentErrors] })] })] })] })] }) }))] })] }), _jsxs("div", { style: {
                            display: "flex",
                            flexDirection: "column",
                            gap: "1rem",
                            position: "sticky",
                            top: "1rem",
                        }, children: [_jsx(VMixOverlayButtons, { vmixConfig: vmixConfig, connectionStatus: connectionStatus, overlayStates: overlayStates, onShowOverlay: showOverlay, onHideOverlay: hideOverlay, isOverlayActive: isOverlayActive, match: match, onUpdateCoachData: updateCoachData, onUpdateReferee1Data: updateReferee1Data, onUpdateReferee2ShowData: updateReferee2ShowData }), _jsxs("div", { style: {
                                    padding: "0.75rem 1rem",
                                    backgroundColor: connectionStatus.connected
                                        ? "#27ae60"
                                        : "#e74c3c",
                                    color: "white",
                                    borderRadius: "4px",
                                    textAlign: "center",
                                    fontSize: "0.95rem",
                                }, children: [_jsx("div", { style: { fontWeight: "bold", marginBottom: "0.25rem" }, children: "vMix" }), _jsx("div", { children: connectionStatus.message })] }), _jsx("button", { onClick: () => navigate("/vmix/settings"), style: {
                                    padding: "0.75rem 1rem",
                                    fontSize: "1rem",
                                    backgroundColor: "#16a085",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                    width: "100%",
                                }, children: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 vMix" })] })] }), _jsxs("div", { style: {
                    display: "flex",
                    gap: "1rem",
                    justifyContent: "center",
                    marginTop: "1rem",
                    flexWrap: "wrap",
                }, children: [_jsx("button", { onClick: () => navigate("/match/settings"), style: {
                            padding: "0.75rem 1.5rem",
                            fontSize: "1rem",
                            backgroundColor: "#3498db",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }, children: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043C\u0430\u0442\u0447\u0430" }), _jsx("button", { onClick: () => navigate("/match/roster"), style: {
                            padding: "0.75rem 1.5rem",
                            fontSize: "1rem",
                            backgroundColor: "#9b59b6",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }, children: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0441\u043E\u0441\u0442\u0430\u0432\u0430\u043C\u0438" }), _jsx("button", { onClick: () => navigate("/mobile/access"), style: {
                            padding: "0.75rem 1.5rem",
                            fontSize: "1rem",
                            backgroundColor: "#f39c12",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }, children: "\u041C\u043E\u0431\u0438\u043B\u044C\u043D\u044B\u0439 \u0434\u043E\u0441\u0442\u0443\u043F" })] }), modalData && (_jsx(SetEditModal, { isOpen: true, onClose: () => setEditingSetNumber(null), set: modalData.setToEdit, isCurrentSet: modalData.isCurrentSet, timezone: match.timezone, match: match, onSave: handleSetSave }, editingSetNumber))] }));
}
export default MatchControlPage;
