import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { memo } from 'react';
import { SET_STATUS } from '../../shared/types/Match';
import { formatDuration } from '../../shared/timeUtils';
import { SetDomain } from '../../shared/domain/SetDomain.js';
function SetsDisplay({ sets, currentSet, onSetClick }) {
    console.log('[SetsDisplay] Рендер:', {
        setsCount: sets.length,
        sets: sets.map(s => ({ setNumber: s.setNumber, scoreA: s.scoreA, scoreB: s.scoreB, status: s.status })),
        currentSet: { setNumber: currentSet.setNumber, status: currentSet.status, scoreA: currentSet.scoreA, scoreB: currentSet.scoreB },
    });
    return (_jsxs("div", { style: {
            backgroundColor: '#ecf0f1',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem',
        }, children: [_jsx("h3", { style: { marginTop: 0 }, children: "\u0421\u0447\u0435\u0442 \u043F\u043E \u043F\u0430\u0440\u0442\u0438\u044F\u043C:" }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }, children: [1, 2, 3, 4, 5].map((setNum) => {
                    const set = sets.find(s => s.setNumber === setNum);
                    const isCurrent = SetDomain.isCurrentSet(setNum, currentSet);
                    const isCompleted = set && SetDomain.isCompleted(set);
                    const isInProgress = isCurrent && currentSet.status === SET_STATUS.IN_PROGRESS && !isCompleted;
                    let backgroundColor, color, content;
                    const canEdit = isCompleted || isInProgress;
                    if (isCompleted) {
                        backgroundColor = '#27ae60';
                        color = 'white';
                        const duration = (set.duration !== null && set.duration !== undefined) ? formatDuration(set.duration) : '';
                        content = (_jsxs(_Fragment, { children: [_jsxs("div", { style: { fontSize: '0.8rem' }, children: ["\u041F\u0430\u0440\u0442\u0438\u044F ", setNum] }), _jsxs("div", { style: { fontSize: '1.2rem', fontWeight: 'bold' }, children: [set.scoreA, " - ", set.scoreB] }), duration && (_jsx("div", { style: { fontSize: '0.7rem', opacity: 0.9 }, children: duration }))] }));
                    }
                    else if (isInProgress) {
                        backgroundColor = '#3498db';
                        color = 'white';
                        content = (_jsxs(_Fragment, { children: [_jsxs("div", { style: { fontSize: '0.8rem' }, children: ["\u041F\u0430\u0440\u0442\u0438\u044F ", setNum] }), _jsx("div", { style: { fontSize: '1rem', fontWeight: 'bold' }, children: "\u0412 \u0438\u0433\u0440\u0435" }), _jsxs("div", { style: { fontSize: '1rem' }, children: [currentSet.scoreA, " - ", currentSet.scoreB] })] }));
                    }
                    else {
                        backgroundColor = '#bdc3c7';
                        color = '#7f8c8d';
                        content = (_jsxs(_Fragment, { children: [_jsxs("div", { style: { fontSize: '0.8rem' }, children: ["\u041F\u0430\u0440\u0442\u0438\u044F ", setNum] }), _jsx("div", { style: { fontSize: '1.2rem' }, children: "-" })] }));
                    }
                    return (_jsx("div", { onClick: () => canEdit && onSetClick && onSetClick(setNum), style: {
                            padding: '0.5rem',
                            backgroundColor,
                            color,
                            borderRadius: '4px',
                            textAlign: 'center',
                            cursor: (canEdit && onSetClick) ? 'pointer' : 'default',
                            transition: 'opacity 0.2s',
                            opacity: canEdit ? 1 : 0.7,
                        }, onMouseEnter: (e) => {
                            if (canEdit && onSetClick) {
                                e.currentTarget.style.opacity = '0.8';
                            }
                        }, onMouseLeave: (e) => {
                            if (canEdit && onSetClick) {
                                e.currentTarget.style.opacity = '1';
                            }
                            else {
                                e.currentTarget.style.opacity = '0.7';
                            }
                        }, children: content }, setNum));
                }) })] }));
}
const areEqual = (prevProps, nextProps) => {
    if (prevProps.sets.length !== nextProps.sets.length) {
        return false;
    }
    const prevSetsMap = new Map(prevProps.sets.map(s => [s.setNumber, s]));
    const nextSetsMap = new Map(nextProps.sets.map(s => [s.setNumber, s]));
    const allSetNumbers = new Set([
        ...prevProps.sets.map(s => s.setNumber),
        ...nextProps.sets.map(s => s.setNumber)
    ]);
    for (const setNumber of allSetNumbers) {
        const prevSet = prevSetsMap.get(setNumber);
        const nextSet = nextSetsMap.get(setNumber);
        if (!prevSet || !nextSet) {
            return false;
        }
        if (prevSet.setNumber !== nextSet.setNumber ||
            prevSet.scoreA !== nextSet.scoreA ||
            prevSet.scoreB !== nextSet.scoreB ||
            prevSet.status !== nextSet.status ||
            prevSet.completed !== nextSet.completed) {
            return false;
        }
    }
    if (prevProps.currentSet.setNumber !== nextProps.currentSet.setNumber ||
        prevProps.currentSet.status !== nextProps.currentSet.status ||
        prevProps.currentSet.scoreA !== nextProps.currentSet.scoreA ||
        prevProps.currentSet.scoreB !== nextProps.currentSet.scoreB) {
        return false;
    }
    return true;
};
export default memo(SetsDisplay, areEqual);
