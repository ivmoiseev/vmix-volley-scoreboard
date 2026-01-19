function isSetball(scoreA, scoreB, setNumber = 1) {
    const setballThreshold = setNumber === 5 ? 14 : 24;
    const maxScore = Math.max(scoreA, scoreB);
    const minScore = Math.min(scoreA, scoreB);
    if (maxScore >= setballThreshold && (maxScore - minScore) >= 1) {
        if (scoreA === scoreB) {
            return {
                isSetball: false,
                team: null
            };
        }
        return {
            isSetball: true,
            team: scoreA > scoreB ? 'A' : 'B'
        };
    }
    return {
        isSetball: false,
        team: null
    };
}
function isMatchball(sets, currentSetNumber, scoreA, scoreB) {
    const winsA = sets.filter(s => {
        const isCompleted = s.completed === true || s.status === 'completed';
        return isCompleted && s.scoreA > s.scoreB;
    }).length;
    const winsB = sets.filter(s => {
        const isCompleted = s.completed === true || s.status === 'completed';
        return isCompleted && s.scoreB > s.scoreA;
    }).length;
    if (winsA === 2 || winsB === 2) {
        const setballInfo = isSetball(scoreA, scoreB, currentSetNumber);
        if (setballInfo.isSetball) {
            if (setballInfo.team === 'A' && winsA === 2) {
                return {
                    isMatchball: true,
                    team: 'A'
                };
            }
            if (setballInfo.team === 'B' && winsB === 2) {
                return {
                    isMatchball: true,
                    team: 'B'
                };
            }
        }
    }
    return {
        isMatchball: false,
        team: null
    };
}
function canFinishSet(scoreA, scoreB, setNumber = 1) {
    const maxScore = Math.max(scoreA, scoreB);
    const minScore = Math.min(scoreA, scoreB);
    const finishThreshold = setNumber === 5 ? 15 : 25;
    const tieThreshold = setNumber === 5 ? 14 : 24;
    if (maxScore >= finishThreshold && (maxScore - minScore) >= 2) {
        return true;
    }
    if (maxScore >= tieThreshold && minScore >= tieThreshold) {
        if ((maxScore - minScore) >= 2) {
            return true;
        }
    }
    return false;
}
function getSetWinner(scoreA, scoreB) {
    if (scoreA > scoreB) {
        return 'A';
    }
    else if (scoreB > scoreA) {
        return 'B';
    }
    return null;
}
function getMatchWinner(sets) {
    const completedSets = sets.filter(s => s.completed);
    const winsA = completedSets.filter(s => s.scoreA > s.scoreB).length;
    const winsB = completedSets.filter(s => s.scoreB > s.scoreA).length;
    if (winsA >= 3) {
        return 'A';
    }
    else if (winsB >= 3) {
        return 'B';
    }
    return null;
}
function isMatchFinished(sets) {
    return getMatchWinner(sets) !== null;
}
export { isSetball, isMatchball, canFinishSet, getSetWinner, getMatchWinner, isMatchFinished, };
