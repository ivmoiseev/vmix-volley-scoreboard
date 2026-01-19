import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { SET_STATUS } from '../../shared/types/Match';
import { formatTimestamp, calculateDuration, formatDuration } from '../../shared/timeUtils';
import { SetDomain } from '../../shared/domain/SetDomain.js';
export default function SetEditModal({ isOpen, onClose, set, isCurrentSet, timezone, match, onSave }) {
    const [formData, setFormData] = useState({
        scoreA: 0,
        scoreB: 0,
        status: SET_STATUS.PENDING,
        startTime: null,
        endTime: null,
    });
    const [errors, setErrors] = useState([]);
    const determineSetStatus = (set) => {
        console.log('[SetEditModal.determineSetStatus] Входные данные:', {
            setNumber: set?.setNumber,
            status: set?.status,
            completed: set?.completed,
            startTime: set?.startTime,
            endTime: set?.endTime,
            fullSet: set,
        });
        if (!set) {
            console.log('[SetEditModal.determineSetStatus] set отсутствует, возвращаем PENDING');
            return SET_STATUS.PENDING;
        }
        if (SetDomain.isCompleted(set)) {
            console.log('[SetEditModal.determineSetStatus] Найден completed === true, возвращаем COMPLETED');
            return SET_STATUS.COMPLETED;
        }
        const validStatuses = [SET_STATUS.COMPLETED, SET_STATUS.IN_PROGRESS, SET_STATUS.PENDING];
        if (set.status && validStatuses.includes(set.status)) {
            console.log('[SetEditModal.determineSetStatus] Найден валидный status:', set.status);
            return set.status;
        }
        if (set.startTime && set.endTime) {
            console.log('[SetEditModal.determineSetStatus] Найдены оба времени, возвращаем COMPLETED');
            return SET_STATUS.COMPLETED;
        }
        if (set.startTime) {
            console.log('[SetEditModal.determineSetStatus] Найдено только startTime, возвращаем IN_PROGRESS');
            return SET_STATUS.IN_PROGRESS;
        }
        console.log('[SetEditModal.determineSetStatus] Не найдено признаков завершенности, возвращаем PENDING');
        return SET_STATUS.PENDING;
    };
    const isAnySubsequentSetStarted = () => {
        if (!match || !set)
            return false;
        const currentSetNumber = set.setNumber;
        console.log('[SetEditModal.isAnySubsequentSetStarted] Проверка:', {
            currentSetNumber,
            sets: match.sets.map(s => ({ setNumber: s.setNumber, status: s.status })),
            currentSet: {
                setNumber: match.currentSet.setNumber,
                status: match.currentSet.status,
            },
        });
        const hasSubsequentCompletedSet = match.sets.some(s => s.setNumber > currentSetNumber);
        const currentSetNumberIsGreater = match.currentSet.setNumber > currentSetNumber;
        const currentSetIsInProgress = currentSetNumberIsGreater && match.currentSet.status === SET_STATUS.IN_PROGRESS;
        const result = hasSubsequentCompletedSet || currentSetIsInProgress;
        console.log('[SetEditModal.isAnySubsequentSetStarted] Результат:', {
            hasSubsequentCompletedSet,
            currentSetNumberIsGreater,
            currentSetStatus: match.currentSet.status,
            currentSetIsInProgress,
            result,
        });
        return result;
    };
    const getIsCompletedSet = () => {
        console.log('[SetEditModal.getIsCompletedSet] Проверка:', {
            isCurrentSet,
            setNumber: set?.setNumber,
            setStatus: set?.status,
            setCompleted: set?.completed,
            setStartTime: set?.startTime,
            setEndTime: set?.endTime,
            formDataStatus: formData.status,
        });
        if (isCurrentSet) {
            console.log('[SetEditModal.getIsCompletedSet] Это текущая партия, возвращаем false');
            return false;
        }
        if (!set) {
            console.log('[SetEditModal.getIsCompletedSet] set отсутствует, возвращаем false');
            return false;
        }
        if (set.status === SET_STATUS.COMPLETED) {
            console.log('[SetEditModal.getIsCompletedSet] Найден status === COMPLETED, возвращаем true');
            return true;
        }
        if (SetDomain.isCompleted(set)) {
            console.log('[SetEditModal.getIsCompletedSet] Найден completed === true, возвращаем true');
            return true;
        }
        if (set.startTime && set.endTime) {
            console.log('[SetEditModal.getIsCompletedSet] Найдены оба времени, возвращаем true');
            return true;
        }
        const result = formData.status === SET_STATUS.COMPLETED;
        console.log('[SetEditModal.getIsCompletedSet] Проверка formData.status, возвращаем:', result);
        return result;
    };
    const getStatusOptions = () => {
        console.log('[SetEditModal.getStatusOptions] Определение опций:', {
            isCurrentSet,
            formDataStatus: formData.status,
            setNumber: set?.setNumber,
            setStatus: set?.status,
            setCompleted: set?.completed,
        });
        if (isCurrentSet && formData.status === SET_STATUS.IN_PROGRESS) {
            console.log('[SetEditModal.getStatusOptions] Текущая партия в игре, возвращаем [IN_PROGRESS, PENDING]');
            return [
                { value: SET_STATUS.IN_PROGRESS, label: 'В игре' },
                { value: SET_STATUS.PENDING, label: 'Не начата' },
            ];
        }
        const isCompletedSet = getIsCompletedSet();
        console.log('[SetEditModal.getStatusOptions] isCompletedSet:', isCompletedSet);
        if (isCompletedSet && match) {
            const subsequentSetStarted = isAnySubsequentSetStarted();
            console.log('[SetEditModal.getStatusOptions] subsequentSetStarted:', subsequentSetStarted);
            if (!subsequentSetStarted) {
                console.log('[SetEditModal.getStatusOptions] Последующая партия не началась, возвращаем [COMPLETED, IN_PROGRESS]');
                return [
                    { value: SET_STATUS.COMPLETED, label: 'Завершена' },
                    { value: SET_STATUS.IN_PROGRESS, label: 'В игре' },
                ];
            }
            console.log('[SetEditModal.getStatusOptions] Последующая партия началась, возвращаем [COMPLETED]');
            return [
                { value: SET_STATUS.COMPLETED, label: 'Завершена' },
            ];
        }
        console.log('[SetEditModal.getStatusOptions] Другие статусы, возвращаем все опции');
        return [
            { value: SET_STATUS.PENDING, label: 'Не начата' },
            { value: SET_STATUS.IN_PROGRESS, label: 'В игре' },
            { value: SET_STATUS.COMPLETED, label: 'Завершена' },
        ];
    };
    useEffect(() => {
        if (!isOpen || !set)
            return;
        console.log('[SetEditModal.useEffect] Инициализация формы:', {
            isOpen,
            setNumber: set.setNumber,
            setStatus: set.status,
            setCompleted: set.completed,
            setStartTime: set.startTime,
            setEndTime: set.endTime,
            isCurrentSet,
            fullSet: set,
        });
        let status = determineSetStatus(set);
        console.log('[SetEditModal.useEffect] Статус после determineSetStatus:', status);
        const isActuallyCompleted = SetDomain.isCompleted(set) ||
            set.status === SET_STATUS.COMPLETED ||
            (set.startTime && set.endTime);
        console.log('[SetEditModal.useEffect] Проверка завершенности:', {
            setCompleted: set.completed,
            setStatus: set.status,
            hasBothTimes: !!(set.startTime && set.endTime),
            isActuallyCompleted,
        });
        if (isActuallyCompleted) {
            console.log('[SetEditModal.useEffect] Партия завершена, принудительно устанавливаем COMPLETED');
            status = SET_STATUS.COMPLETED;
        }
        if (set.setNumber && isActuallyCompleted && status !== SET_STATUS.COMPLETED) {
            console.warn('[SetEditModal.useEffect] ⚠️ Несоответствие статуса:', {
                setNumber: set.setNumber,
                setStatus: set.status,
                setCompleted: set.completed,
                startTime: set.startTime,
                endTime: set.endTime,
                determinedStatus: status,
                isActuallyCompleted,
                finalStatus: SET_STATUS.COMPLETED,
                setObject: set,
            });
        }
        console.log('[SetEditModal.useEffect] Устанавливаем formData со статусом:', status);
        setFormData({
            scoreA: set.scoreA || 0,
            scoreB: set.scoreB || 0,
            status: status,
            startTime: set.startTime || null,
            endTime: set.endTime || null,
        });
        setErrors([]);
    }, [isOpen, set?.setNumber]);
    const duration = formData.startTime && formData.endTime
        ? calculateDuration(formData.startTime, formData.endTime)
        : null;
    const handleChange = (field, value) => {
        setFormData(prev => {
            const newFormData = {
                ...prev,
                [field]: value,
            };
            if (field === 'status') {
                if (value === SET_STATUS.PENDING) {
                    newFormData.startTime = null;
                    newFormData.endTime = null;
                }
                else if (value === SET_STATUS.IN_PROGRESS) {
                    newFormData.endTime = null;
                }
            }
            return newFormData;
        });
        setErrors([]);
    };
    const handleDateTimeChange = (field, value) => {
        if (!value) {
            handleChange(field, null);
            return;
        }
        try {
            const [datePart, timePart] = value.split('T');
            const [year, month, day] = datePart.split('-').map(Number);
            const [hour, minute] = timePart.split(':').map(Number);
            if (timezone) {
                const isoString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
                const localDate = new Date(isoString);
                const localTimestamp = localDate.getTime();
                const testDate = new Date(localTimestamp);
                const tzFormatter = new Intl.DateTimeFormat('en', {
                    timeZone: timezone,
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                });
                const tzParts = tzFormatter.formatToParts(testDate);
                const tzYear = tzParts.find(p => p.type === 'year').value;
                const tzMonth = tzParts.find(p => p.type === 'month').value;
                const tzDay = tzParts.find(p => p.type === 'day').value;
                const tzHour = tzParts.find(p => p.type === 'hour').value;
                const tzMinute = tzParts.find(p => p.type === 'minute').value;
                const tzString = `${tzYear}-${tzMonth}-${tzDay}T${tzHour}:${tzMinute}`;
                const inputString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                if (tzString === inputString) {
                    handleChange(field, localTimestamp);
                }
                else {
                    const tzDate = new Date(tzString);
                    const offsetMs = tzDate.getTime() - localTimestamp;
                    const correctedTimestamp = localTimestamp - offsetMs;
                    handleChange(field, correctedTimestamp);
                }
            }
            else {
                const timestamp = new Date(value).getTime();
                handleChange(field, timestamp);
            }
        }
        catch (e) {
            console.error('Ошибка при парсинге даты:', e);
            setErrors(['Некорректный формат даты/времени']);
        }
    };
    const validateTimeOverlap = (startTime, endTime) => {
        if (!match || !startTime || !endTime)
            return null;
        const errors = [];
        const currentSetNumber = set.setNumber;
        const previousSet = match.sets.find(s => s.setNumber === currentSetNumber - 1);
        if (previousSet && previousSet.startTime && previousSet.endTime) {
            if (startTime < previousSet.endTime) {
                errors.push(`Время начала партии ${currentSetNumber} пересекается с временем окончания партии ${currentSetNumber - 1}`);
            }
        }
        const nextSetNumber = currentSetNumber + 1;
        const nextSet = match.sets.find(s => s.setNumber === nextSetNumber);
        if (nextSet && nextSet.startTime && nextSet.endTime) {
            if (endTime > nextSet.startTime) {
                errors.push(`Время окончания партии ${currentSetNumber} пересекается с временем начала партии ${nextSetNumber}`);
            }
        }
        if (!isCurrentSet && match.currentSet.setNumber === nextSetNumber && match.currentSet.startTime) {
            if (endTime > match.currentSet.startTime) {
                errors.push(`Время окончания партии ${currentSetNumber} пересекается с временем начала партии ${nextSetNumber}`);
            }
        }
        return errors.length > 0 ? errors : null;
    };
    const handleSave = () => {
        console.log('[SetEditModal.handleSave] Начало сохранения:', {
            formData,
            isStatusChangeBlocked,
            setNumber: set?.setNumber,
        });
        if (isStatusChangeBlocked && formData.status !== SET_STATUS.COMPLETED) {
            console.log('[SetEditModal.handleSave] Блокировка: следующая партия уже началась');
            setErrors(['Нельзя изменить статус: следующая партия уже началась']);
            return;
        }
        const updates = {
            scoreA: parseInt(formData.scoreA, 10),
            scoreB: parseInt(formData.scoreB, 10),
            status: formData.status,
        };
        if (formData.status === SET_STATUS.PENDING) {
            updates.startTime = null;
            updates.endTime = null;
        }
        else if (formData.status === SET_STATUS.IN_PROGRESS) {
            if (formData.startTime) {
                updates.startTime = formData.startTime;
            }
            updates.endTime = null;
        }
        else if (formData.status === SET_STATUS.COMPLETED) {
            if (formData.startTime) {
                updates.startTime = formData.startTime;
            }
            if (formData.endTime) {
                updates.endTime = formData.endTime;
            }
            if (formData.startTime && formData.endTime) {
                const timeErrors = validateTimeOverlap(formData.startTime, formData.endTime);
                if (timeErrors) {
                    console.log('[SetEditModal.handleSave] Ошибки валидации времени:', timeErrors);
                    setErrors(timeErrors);
                    return;
                }
            }
        }
        console.log('[SetEditModal.handleSave] Вызываем onSave с обновлениями:', updates);
        if (onSave) {
            const result = onSave(updates);
            console.log('[SetEditModal.handleSave] Результат onSave:', result);
            if (result) {
                console.log('[SetEditModal.handleSave] Сохранение успешно, закрываем модальное окно');
                onClose();
            }
            else {
                console.warn('[SetEditModal.handleSave] Сохранение не удалось, модальное окно остается открытым');
            }
        }
        else {
            console.error('[SetEditModal.handleSave] onSave не определен!');
        }
    };
    if (!isOpen || !set)
        return null;
    const timestampToDateTimeLocal = (timestamp, tz) => {
        if (!timestamp)
            return '';
        const date = new Date(timestamp);
        if (tz) {
            const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: tz,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
            });
            const parts = formatter.formatToParts(date);
            const year = parts.find(p => p.type === 'year').value;
            const month = parts.find(p => p.type === 'month').value;
            const day = parts.find(p => p.type === 'day').value;
            const hour = parts.find(p => p.type === 'hour').value;
            const minute = parts.find(p => p.type === 'minute').value;
            return `${year}-${month}-${day}T${hour}:${minute}`;
        }
        else {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hour = String(date.getHours()).padStart(2, '0');
            const minute = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hour}:${minute}`;
        }
    };
    const startDateTime = timestampToDateTimeLocal(formData.startTime, timezone);
    const endDateTime = timestampToDateTimeLocal(formData.endTime, timezone);
    const isCompletedSet = useMemo(() => getIsCompletedSet(), [isCurrentSet, set, formData.status]);
    const subsequentSetStarted = useMemo(() => isAnySubsequentSetStarted(), [match, set]);
    const isStatusChangeBlocked = useMemo(() => isCompletedSet && match && subsequentSetStarted, [isCompletedSet, match, subsequentSetStarted]);
    const statusOptions = useMemo(() => getStatusOptions(), [isCurrentSet, formData.status, set, match, isCompletedSet, subsequentSetStarted]);
    return (_jsx("div", { style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        }, onClick: onClose, children: _jsxs("div", { style: {
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '8px',
                maxWidth: '500px',
                width: '90%',
                maxHeight: '90vh',
                overflow: 'auto',
            }, onClick: (e) => e.stopPropagation(), children: [_jsxs("h2", { style: { marginTop: 0 }, children: ["\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043F\u0430\u0440\u0442\u0438\u0438 ", set?.setNumber] }), errors.length > 0 && (_jsx("div", { style: {
                        backgroundColor: '#fee',
                        color: '#c33',
                        padding: '0.75rem',
                        borderRadius: '4px',
                        marginBottom: '1rem',
                    }, children: errors.map((error, i) => (_jsx("div", { children: error }, i))) })), isStatusChangeBlocked && (_jsx("div", { style: {
                        backgroundColor: '#fff3cd',
                        color: '#856404',
                        padding: '0.75rem',
                        borderRadius: '4px',
                        marginBottom: '1rem',
                    }, children: "\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435 \u0441\u0442\u0430\u0442\u0443\u0441\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E: \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0430\u044F \u043F\u0430\u0440\u0442\u0438\u044F \u0443\u0436\u0435 \u043D\u0430\u0447\u0430\u043B\u0430\u0441\u044C. \u041C\u043E\u0436\u043D\u043E \u0440\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0447\u0435\u0442 \u0438 \u0432\u0440\u0435\u043C\u044F." })), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0421\u0447\u0435\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u044B A:" }), _jsx("input", { type: "number", min: "0", value: formData.scoreA, onChange: (e) => handleChange('scoreA', e.target.value), style: {
                                width: '100%',
                                padding: '0.5rem',
                                fontSize: '1rem',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                            } })] }), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0421\u0447\u0435\u0442 \u043A\u043E\u043C\u0430\u043D\u0434\u044B B:" }), _jsx("input", { type: "number", min: "0", value: formData.scoreB, onChange: (e) => handleChange('scoreB', e.target.value), style: {
                                width: '100%',
                                padding: '0.5rem',
                                fontSize: '1rem',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                            } })] }), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0421\u0442\u0430\u0442\u0443\u0441:" }), _jsx("select", { value: formData.status, onChange: (e) => handleChange('status', e.target.value), disabled: isStatusChangeBlocked, style: {
                                width: '100%',
                                padding: '0.5rem',
                                fontSize: '1rem',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                opacity: isStatusChangeBlocked ? 0.5 : 1,
                            }, children: statusOptions.map(option => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0412\u0440\u0435\u043C\u044F \u043D\u0430\u0447\u0430\u043B\u0430:" }), _jsx("input", { type: "datetime-local", value: startDateTime, onChange: (e) => handleDateTimeChange('startTime', e.target.value), disabled: formData.status === SET_STATUS.PENDING, style: {
                                width: '100%',
                                padding: '0.5rem',
                                fontSize: '1rem',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                opacity: formData.status === SET_STATUS.PENDING ? 0.5 : 1,
                            } }), formData.startTime && (_jsx("div", { style: { fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }, children: formatTimestamp(formData.startTime, timezone) }))] }), _jsxs("div", { style: { marginBottom: '1rem' }, children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0412\u0440\u0435\u043C\u044F \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u044F:" }), _jsx("input", { type: "datetime-local", value: endDateTime, onChange: (e) => handleDateTimeChange('endTime', e.target.value), disabled: formData.status === SET_STATUS.PENDING || formData.status === SET_STATUS.IN_PROGRESS, style: {
                                width: '100%',
                                padding: '0.5rem',
                                fontSize: '1rem',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                opacity: (formData.status === SET_STATUS.PENDING || formData.status === SET_STATUS.IN_PROGRESS) ? 0.5 : 1,
                            } }), formData.endTime && (_jsx("div", { style: { fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }, children: formatTimestamp(formData.endTime, timezone) }))] }), duration !== null && (_jsxs("div", { style: { marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#f0f0f0', borderRadius: '4px' }, children: [_jsx("strong", { children: "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C:" }), " ", formatDuration(duration)] })), _jsxs("div", { style: { display: 'flex', gap: '1rem', justifyContent: 'flex-end' }, children: [_jsx("button", { onClick: onClose, style: {
                                padding: '0.75rem 1.5rem',
                                fontSize: '1rem',
                                backgroundColor: '#95a5a6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            }, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { onClick: handleSave, style: {
                                padding: '0.75rem 1.5rem',
                                fontSize: '1rem',
                                backgroundColor: '#27ae60',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                            }, children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] })] }) }));
}
