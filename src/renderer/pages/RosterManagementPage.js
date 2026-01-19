import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVMix } from '../hooks/useVMix';
import { useHeaderButtons } from '../components/Layout';
import { getContrastTextColor } from '../utils/colorContrast';
const POSITIONS = [
    'Не указано',
    'Нападающий',
    'Связующий',
    'Доигровщик',
    'Центральный блокирующий',
    'Либеро',
];
function RosterManagementPage({ match: propMatch, onMatchChange }) {
    const navigate = useNavigate();
    const location = useLocation();
    const matchFromState = location.state?.match;
    const { setButtons } = useHeaderButtons();
    const [match, setMatch] = useState(propMatch || matchFromState || null);
    const { updateMatchData, connectionStatus } = useVMix(match);
    const [selectedTeam, setSelectedTeam] = useState('A');
    const [roster, setRoster] = useState([]);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [draggedRosterIndex, setDraggedRosterIndex] = useState(null);
    useEffect(() => {
        if (propMatch) {
            setMatch(propMatch);
        }
        else if (matchFromState) {
            setMatch(matchFromState);
        }
    }, [propMatch, matchFromState]);
    useEffect(() => {
        if (!match) {
            const timer = setTimeout(() => {
                if (!match) {
                    navigate('/');
                }
            }, 100);
            return () => clearTimeout(timer);
        }
        updateRoster();
    }, [match, selectedTeam, navigate]);
    const updateRoster = () => {
        const team = selectedTeam === 'A' ? match.teamA : match.teamB;
        setRoster(team.roster || []);
    };
    const getOrderedStarters = () => {
        const team = selectedTeam === 'A' ? match.teamA : match.teamB;
        const teamRoster = team.roster || [];
        const starters = teamRoster.filter(p => p.isStarter);
        if (team.startingLineupOrder && Array.isArray(team.startingLineupOrder) && team.startingLineupOrder.length > 0) {
            const orderedStarters = team.startingLineupOrder
                .map(index => teamRoster[index])
                .filter(player => player && player.isStarter);
            starters.forEach(player => {
                const rosterIndex = teamRoster.findIndex(p => p.number === player.number &&
                    p.name === player.name &&
                    p.isStarter === true);
                if (rosterIndex !== -1 && !team.startingLineupOrder.includes(rosterIndex)) {
                    orderedStarters.push(player);
                }
            });
            return orderedStarters;
        }
        return starters;
    };
    const handleAddPlayer = () => {
        let nextNumber = 1;
        if (roster.length > 0) {
            const numbers = roster
                .map(p => p.number)
                .filter(num => num != null && !isNaN(num) && num > 0);
            if (numbers.length > 0) {
                nextNumber = Math.max(...numbers) + 1;
            }
        }
        const newPlayer = {
            number: nextNumber,
            name: '',
            position: POSITIONS[0],
            isStarter: false,
        };
        const updatedRoster = [...roster, newPlayer];
        updateTeamRoster(updatedRoster);
    };
    const handleRemovePlayer = (index) => {
        const updatedRoster = roster.filter((_, i) => i !== index);
        const team = selectedTeam === 'A' ? match.teamA : match.teamB;
        const currentStartingLineupOrder = team.startingLineupOrder || [];
        const newStartingLineupOrder = currentStartingLineupOrder
            .filter(i => i !== index)
            .map(i => i > index ? i - 1 : i);
        updateTeamRoster(updatedRoster, newStartingLineupOrder);
    };
    const handlePlayerChange = (index, field, value) => {
        const updatedRoster = roster.map((player, i) => {
            if (i === index) {
                if (field === 'number') {
                    if (value === null || value === undefined || value === '') {
                        return { ...player, [field]: null };
                    }
                    const numValue = parseInt(value, 10);
                    if (isNaN(numValue) || numValue < 0) {
                        return { ...player, [field]: null };
                    }
                    return { ...player, [field]: numValue };
                }
                return { ...player, [field]: value };
            }
            return player;
        });
        updateTeamRoster(updatedRoster);
    };
    const handleToggleStarter = (index) => {
        const updatedRoster = roster.map((player, i) => {
            if (i === index) {
                return { ...player, isStarter: !player.isStarter };
            }
            return player;
        });
        const team = selectedTeam === 'A' ? match.teamA : match.teamB;
        let newStartingLineupOrder = team.startingLineupOrder || [];
        const player = updatedRoster[index];
        if (player.isStarter) {
            if (!newStartingLineupOrder.includes(index)) {
                newStartingLineupOrder = [...newStartingLineupOrder, index];
            }
        }
        else {
            newStartingLineupOrder = newStartingLineupOrder.filter(i => i !== index);
        }
        updateTeamRoster(updatedRoster, newStartingLineupOrder);
    };
    const handleDragStart = (e, cellIndex) => {
        setDraggedIndex(cellIndex);
        e.dataTransfer.effectAllowed = 'move';
        if (e.target.style) {
            e.target.style.opacity = '0.5';
        }
    };
    const handleDragEnd = (e) => {
        if (e.target.style) {
            e.target.style.opacity = '1';
        }
        setDraggedIndex(null);
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };
    const handleDropOnCell = (targetCellIndex) => {
        if (draggedIndex === null || draggedIndex === targetCellIndex) {
            return;
        }
        const slots = Array(8).fill(null);
        starters.forEach((player, index) => {
            if (index < 8) {
                slots[index] = player;
            }
        });
        const playerToMove = slots[draggedIndex];
        const playerAtTarget = slots[targetCellIndex];
        slots[draggedIndex] = playerAtTarget;
        slots[targetCellIndex] = playerToMove;
        const newStartingLineupOrder = slots
            .filter(p => p !== null)
            .map(player => {
            return roster.findIndex(p => p.number === player.number &&
                p.name === player.name &&
                p.isStarter === true);
        })
            .filter(index => index !== -1);
        const updatedMatch = { ...match };
        if (selectedTeam === 'A') {
            updatedMatch.teamA = {
                ...updatedMatch.teamA,
                startingLineupOrder: newStartingLineupOrder,
            };
        }
        else {
            updatedMatch.teamB = {
                ...updatedMatch.teamB,
                startingLineupOrder: newStartingLineupOrder,
            };
        }
        updatedMatch.updatedAt = new Date().toISOString();
        setMatch(updatedMatch);
        if (onMatchChange) {
            onMatchChange(updatedMatch);
        }
        if (window.electronAPI) {
            window.electronAPI.setCurrentMatch(updatedMatch).catch(err => {
                console.error('Ошибка при обновлении матча:', err);
            });
            window.electronAPI.setMobileMatch(updatedMatch).catch(err => {
                console.error('Ошибка при обновлении мобильного матча:', err);
            });
        }
        setDraggedIndex(null);
    };
    const handleRosterDragStart = (e, index) => {
        setDraggedRosterIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        if (e.currentTarget.parentElement && e.currentTarget.parentElement.style) {
            e.currentTarget.parentElement.style.opacity = '0.5';
        }
    };
    const handleRosterDragEnd = (e) => {
        if (e.currentTarget.parentElement && e.currentTarget.parentElement.style) {
            e.currentTarget.parentElement.style.opacity = '1';
        }
        setDraggedRosterIndex(null);
    };
    const handleRosterDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (e.currentTarget && e.currentTarget.style) {
            e.currentTarget.style.backgroundColor = '#e8f5e9';
        }
    };
    const handleRosterDragLeave = (e) => {
        if (e.currentTarget && e.currentTarget.style) {
            e.currentTarget.style.backgroundColor = '';
        }
    };
    const handleRosterDrop = (e, targetIndex) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedRosterIndex === null || draggedRosterIndex === targetIndex) {
            return;
        }
        const team = selectedTeam === 'A' ? match.teamA : match.teamB;
        const oldStartingLineupOrder = team.startingLineupOrder || [];
        const newRoster = [...roster];
        const [draggedPlayer] = newRoster.splice(draggedRosterIndex, 1);
        const insertIndex = targetIndex;
        newRoster.splice(insertIndex, 0, draggedPlayer);
        const indexMap = new Map();
        for (let oldIndex = 0; oldIndex < roster.length; oldIndex++) {
            let newIndex;
            if (oldIndex === draggedRosterIndex) {
                newIndex = targetIndex;
            }
            else if (targetIndex > draggedRosterIndex) {
                if (oldIndex < draggedRosterIndex) {
                    newIndex = oldIndex;
                }
                else if (oldIndex > draggedRosterIndex && oldIndex <= targetIndex) {
                    newIndex = oldIndex - 1;
                }
                else {
                    newIndex = oldIndex;
                }
            }
            else {
                if (oldIndex < targetIndex) {
                    newIndex = oldIndex;
                }
                else if (oldIndex >= targetIndex && oldIndex < draggedRosterIndex) {
                    newIndex = oldIndex + 1;
                }
                else {
                    newIndex = oldIndex;
                }
            }
            indexMap.set(oldIndex, newIndex);
        }
        const newStartingLineupOrder = oldStartingLineupOrder
            .map(oldIndex => indexMap.get(oldIndex))
            .filter(newIndex => newIndex !== undefined && newIndex >= 0 && newIndex < newRoster.length)
            .filter(newIndex => newRoster[newIndex] && newRoster[newIndex].isStarter);
        updateTeamRoster(newRoster, newStartingLineupOrder);
        setDraggedRosterIndex(null);
    };
    const updateTeamRoster = (newRoster, newStartingLineupOrder = null) => {
        setRoster(newRoster);
        const updatedMatch = { ...match };
        const teamData = {
            roster: newRoster,
        };
        if (newStartingLineupOrder !== null) {
            teamData.startingLineupOrder = newStartingLineupOrder;
        }
        else {
            const currentStartingLineupOrder = (selectedTeam === 'A' ? match.teamA : match.teamB).startingLineupOrder || [];
            const validStartingLineupOrder = currentStartingLineupOrder.filter(index => index >= 0 &&
                index < newRoster.length &&
                newRoster[index].isStarter);
            if (validStartingLineupOrder.length !== currentStartingLineupOrder.length) {
                teamData.startingLineupOrder = validStartingLineupOrder;
            }
        }
        if (selectedTeam === 'A') {
            updatedMatch.teamA = {
                ...updatedMatch.teamA,
                ...teamData,
            };
        }
        else {
            updatedMatch.teamB = {
                ...updatedMatch.teamB,
                ...teamData,
            };
        }
        updatedMatch.updatedAt = new Date().toISOString();
        setMatch(updatedMatch);
        if (onMatchChange) {
            onMatchChange(updatedMatch);
        }
        if (window.electronAPI) {
            window.electronAPI.setCurrentMatch(updatedMatch).catch(err => {
                console.error('Ошибка при обновлении матча:', err);
            });
            window.electronAPI.setMobileMatch(updatedMatch).catch(err => {
                console.error('Ошибка при обновлении мобильного матча:', err);
            });
        }
    };
    const handleSave = async () => {
        if (!match)
            return;
        if (window.electronAPI) {
            try {
                await window.electronAPI.setCurrentMatch(match);
                await window.electronAPI.setMobileMatch(match);
            }
            catch (error) {
                console.error('Ошибка при сохранении матча:', error);
            }
        }
        if (onMatchChange) {
            onMatchChange(match);
        }
        if (connectionStatus.connected) {
            updateMatchData(match, true);
        }
        navigate('/match', { state: { match } });
    };
    const handleCancel = () => {
        navigate('/match', { state: { match } });
    };
    useEffect(() => {
        if (match) {
            setButtons(_jsxs(_Fragment, { children: [_jsx("button", { onClick: handleCancel, style: {
                            padding: '0.5rem 1rem',
                            backgroundColor: '#95a5a6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }, children: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C" }), _jsx("button", { onClick: handleSave, style: {
                            padding: '0.5rem 1rem',
                            backgroundColor: '#27ae60',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                        }, children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438 \u0432\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F" })] }));
        }
        return () => setButtons(null);
    }, [match, setButtons]);
    const handleExportRoster = () => {
        const team = selectedTeam === 'A' ? match.teamA : match.teamB;
        const exportData = {
            coach: team.coach || '',
            roster: team.roster || [],
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `roster_${team.name}_${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };
    const handleImportRoster = async (event) => {
        const file = event.target.files[0];
        if (!file)
            return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (!importedData.roster || !Array.isArray(importedData.roster)) {
                    alert('Некорректный формат файла. Ожидается объект с полями "roster" (массив) и "coach" (строка)');
                    return;
                }
                const importedRoster = importedData.roster;
                const importedCoach = importedData.coach || '';
                const importedStartingLineupOrder = importedRoster
                    .map((player, index) => player.isStarter ? index : null)
                    .filter(index => index !== null);
                const updatedMatch = { ...match };
                if (selectedTeam === 'A') {
                    updatedMatch.teamA = {
                        ...updatedMatch.teamA,
                        roster: importedRoster,
                        startingLineupOrder: importedStartingLineupOrder,
                        coach: importedCoach,
                    };
                }
                else {
                    updatedMatch.teamB = {
                        ...updatedMatch.teamB,
                        roster: importedRoster,
                        startingLineupOrder: importedStartingLineupOrder,
                        coach: importedCoach,
                    };
                }
                updatedMatch.updatedAt = new Date().toISOString();
                setMatch(updatedMatch);
                setRoster(importedRoster);
                if (onMatchChange) {
                    onMatchChange(updatedMatch);
                }
                if (window.electronAPI) {
                    window.electronAPI.setCurrentMatch(updatedMatch).catch(err => {
                        console.error('Ошибка при обновлении матча:', err);
                    });
                    window.electronAPI.setMobileMatch(updatedMatch).catch(err => {
                        console.error('Ошибка при обновлении мобильного матча:', err);
                    });
                }
                alert('Состав и тренер успешно импортированы!');
            }
            catch (error) {
                alert('Ошибка при чтении файла: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    if (!match) {
        return null;
    }
    const team = selectedTeam === 'A' ? match.teamA : match.teamB;
    const starters = getOrderedStarters();
    return (_jsxs("div", { style: { padding: '1rem', maxWidth: '1200px', margin: '0 auto' }, children: [_jsxs("div", { style: {
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                }, children: [_jsx("button", { onClick: () => setSelectedTeam('A'), style: {
                            padding: '0.75rem 1.5rem',
                            fontSize: '1rem',
                            backgroundColor: selectedTeam === 'A' ? match.teamA.color : '#95a5a6',
                            color: getContrastTextColor(selectedTeam === 'A' ? match.teamA.color : '#95a5a6'),
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: selectedTeam === 'A' ? 'bold' : 'normal',
                        }, children: match.teamA.name }), _jsx("button", { onClick: () => setSelectedTeam('B'), style: {
                            padding: '0.75rem 1.5rem',
                            fontSize: '1rem',
                            backgroundColor: selectedTeam === 'B' ? match.teamB.color : '#95a5a6',
                            color: getContrastTextColor(selectedTeam === 'B' ? match.teamB.color : '#95a5a6'),
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: selectedTeam === 'B' ? 'bold' : 'normal',
                        }, children: match.teamB.name })] }), _jsxs("div", { style: {
                    backgroundColor: '#ecf0f1',
                    padding: '1.5rem',
                    borderRadius: '4px',
                    marginBottom: '1.5rem',
                }, children: [_jsxs("div", { style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem',
                        }, children: [_jsx("h3", { style: { marginTop: 0 }, children: "\u0421\u043E\u0441\u0442\u0430\u0432 \u043A\u043E\u043C\u0430\u043D\u0434\u044B" }), _jsxs("div", { style: { display: 'flex', gap: '0.5rem' }, children: [_jsxs("label", { style: {
                                            padding: '0.5rem 1rem',
                                            backgroundColor: '#27ae60',
                                            color: 'white',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            display: 'inline-block',
                                        }, children: ["\u0418\u043C\u043F\u043E\u0440\u0442", _jsx("input", { type: "file", accept: ".json", onChange: handleImportRoster, style: { display: 'none' } })] }), _jsx("button", { onClick: handleExportRoster, style: {
                                            padding: '0.5rem 1rem',
                                            backgroundColor: '#3498db',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                        }, children: "\u042D\u043A\u0441\u043F\u043E\u0440\u0442" }), _jsx("button", { onClick: handleAddPlayer, style: {
                                            padding: '0.5rem 1rem',
                                            backgroundColor: '#27ae60',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                        }, children: "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0438\u0433\u0440\u043E\u043A\u0430" })] })] }), _jsxs("div", { style: { overflowX: 'auto' }, children: [_jsxs("table", { style: {
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    backgroundColor: 'white',
                                    borderRadius: '4px',
                                }, children: [_jsx("thead", { children: _jsxs("tr", { style: { backgroundColor: '#34495e', color: 'white' }, children: [_jsx("th", { style: { padding: '0.75rem', textAlign: 'left', width: '30px' } }), _jsx("th", { style: { padding: '0.75rem', textAlign: 'left' }, children: "\u2116" }), _jsx("th", { style: { padding: '0.75rem', textAlign: 'left' }, children: "\u0418\u043C\u044F" }), _jsx("th", { style: { padding: '0.75rem', textAlign: 'left' }, children: "\u041F\u043E\u0437\u0438\u0446\u0438\u044F" }), _jsx("th", { style: { padding: '0.75rem', textAlign: 'center' }, children: "\u0421\u0442\u0430\u0440\u0442\u043E\u0432\u044B\u0439" }), _jsx("th", { style: { padding: '0.75rem', textAlign: 'center' }, children: "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F" })] }) }), _jsx("tbody", { children: roster.map((player, index) => (_jsxs("tr", { style: {
                                                borderBottom: '1px solid #ecf0f1',
                                                opacity: draggedRosterIndex === index ? 0.5 : 1,
                                                cursor: 'move',
                                            }, draggable: true, onDragStart: (e) => handleRosterDragStart(e, index), onDragEnd: handleRosterDragEnd, onDragOver: handleRosterDragOver, onDragLeave: handleRosterDragLeave, onDrop: (e) => {
                                                handleRosterDrop(e, index);
                                                handleRosterDragLeave(e);
                                            }, children: [_jsx("td", { style: {
                                                        padding: '0.75rem',
                                                        textAlign: 'center',
                                                        cursor: 'grab',
                                                        userSelect: 'none',
                                                        color: '#7f8c8d',
                                                    }, title: "\u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435 \u0434\u043B\u044F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u043F\u043E\u0440\u044F\u0434\u043A\u0430", children: _jsxs("div", { style: {
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '2px',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                        }, children: [_jsx("div", { style: {
                                                                    width: '16px',
                                                                    height: '2px',
                                                                    backgroundColor: '#7f8c8d',
                                                                    borderRadius: '1px',
                                                                } }), _jsx("div", { style: {
                                                                    width: '16px',
                                                                    height: '2px',
                                                                    backgroundColor: '#7f8c8d',
                                                                    borderRadius: '1px',
                                                                } }), _jsx("div", { style: {
                                                                    width: '16px',
                                                                    height: '2px',
                                                                    backgroundColor: '#7f8c8d',
                                                                    borderRadius: '1px',
                                                                } })] }) }), _jsx("td", { style: { padding: '0.75rem' }, children: _jsx("input", { type: "number", min: "0", value: player.number ?? '', onChange: (e) => {
                                                            const inputValue = e.target.value;
                                                            if (inputValue === '' || inputValue === '-') {
                                                                handlePlayerChange(index, 'number', null);
                                                                return;
                                                            }
                                                            const numValue = parseInt(inputValue, 10);
                                                            handlePlayerChange(index, 'number', isNaN(numValue) ? null : numValue);
                                                        }, onBlur: (e) => {
                                                            const inputValue = e.target.value;
                                                            if (inputValue === '' || inputValue === '-') {
                                                                handlePlayerChange(index, 'number', null);
                                                                return;
                                                            }
                                                            const numValue = parseInt(inputValue, 10);
                                                            if (numValue < 0 || isNaN(numValue)) {
                                                                handlePlayerChange(index, 'number', null);
                                                            }
                                                        }, placeholder: "\u0411\u0435\u0437 \u043D\u043E\u043C\u0435\u0440\u0430", style: {
                                                            width: '80px',
                                                            padding: '0.25rem',
                                                            border: '1px solid #bdc3c7',
                                                            borderRadius: '4px',
                                                        } }) }), _jsx("td", { style: { padding: '0.75rem' }, children: _jsx("input", { type: "text", value: player.name, onChange: (e) => handlePlayerChange(index, 'name', e.target.value), style: {
                                                            width: '100%',
                                                            padding: '0.25rem',
                                                            border: '1px solid #bdc3c7',
                                                            borderRadius: '4px',
                                                        }, placeholder: "\u0418\u043C\u044F \u0438\u0433\u0440\u043E\u043A\u0430" }) }), _jsx("td", { style: { padding: '0.75rem' }, children: _jsx("select", { value: player.position, onChange: (e) => handlePlayerChange(index, 'position', e.target.value), style: {
                                                            width: '100%',
                                                            padding: '0.25rem',
                                                            border: '1px solid #bdc3c7',
                                                            borderRadius: '4px',
                                                        }, children: POSITIONS.map(pos => (_jsx("option", { value: pos, children: pos }, pos))) }) }), _jsx("td", { style: { padding: '0.75rem', textAlign: 'center' }, children: _jsx("input", { type: "checkbox", checked: player.isStarter, onChange: () => handleToggleStarter(index) }) }), _jsx("td", { style: { padding: '0.75rem', textAlign: 'center' }, children: _jsx("button", { onClick: () => handleRemovePlayer(index), style: {
                                                            padding: '0.25rem 0.5rem',
                                                            backgroundColor: '#e74c3c',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                        }, children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" }) })] }, index))) })] }), roster.length === 0 && (_jsx("div", { style: { padding: '2rem', textAlign: 'center', color: '#7f8c8d' }, children: "\u0421\u043E\u0441\u0442\u0430\u0432 \u043F\u0443\u0441\u0442. \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0438\u0433\u0440\u043E\u043A\u043E\u0432." }))] }), _jsxs("div", { style: { marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid #bdc3c7' }, children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0422\u0440\u0435\u043D\u0435\u0440" }), _jsx("input", { type: "text", value: team.coach || '', onChange: (e) => {
                                    const updatedMatch = { ...match };
                                    if (selectedTeam === 'A') {
                                        updatedMatch.teamA = {
                                            ...updatedMatch.teamA,
                                            coach: e.target.value,
                                        };
                                    }
                                    else {
                                        updatedMatch.teamB = {
                                            ...updatedMatch.teamB,
                                            coach: e.target.value,
                                        };
                                    }
                                    updatedMatch.updatedAt = new Date().toISOString();
                                    setMatch(updatedMatch);
                                    if (onMatchChange) {
                                        onMatchChange(updatedMatch);
                                    }
                                    if (window.electronAPI) {
                                        window.electronAPI.setCurrentMatch(updatedMatch).catch(err => {
                                            console.error('Ошибка при обновлении матча:', err);
                                        });
                                        window.electronAPI.setMobileMatch(updatedMatch).catch(err => {
                                            console.error('Ошибка при обновлении мобильного матча:', err);
                                        });
                                    }
                                }, style: {
                                    width: '100%',
                                    maxWidth: '400px',
                                    padding: '0.5rem',
                                    fontSize: '1rem',
                                    border: '1px solid #bdc3c7',
                                    borderRadius: '4px',
                                }, placeholder: "\u0418\u043C\u044F \u0442\u0440\u0435\u043D\u0435\u0440\u0430" })] })] }), starters.length > 0 && (_jsxs("div", { style: {
                    backgroundColor: '#ecf0f1',
                    padding: '1.5rem',
                    borderRadius: '4px',
                    marginBottom: '1.5rem',
                }, children: [_jsx("h3", { style: { marginTop: 0 }, children: "\u0421\u0442\u0430\u0440\u0442\u043E\u0432\u044B\u0439 \u0441\u043E\u0441\u0442\u0430\u0432" }), _jsx("p", { style: { marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.9rem', color: '#7f8c8d' }, children: "\u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435 \u0438\u0433\u0440\u043E\u043A\u043E\u0432 \u0434\u043B\u044F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u043F\u043E\u0440\u044F\u0434\u043A\u0430" }), _jsx("div", { style: {
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '1rem',
                        }, children: Array.from({ length: 8 }).map((_, cellIndex) => {
                            const player = starters[cellIndex] || null;
                            const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI'];
                            const isLibero = cellIndex >= 6;
                            const liberoLabels = ['Либеро 1', 'Либеро 2'];
                            return (_jsxs("div", { onDragOver: handleDragOver, onDrop: (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (draggedIndex !== null) {
                                        handleDropOnCell(cellIndex);
                                    }
                                }, style: {
                                    minHeight: '80px',
                                    border: `2px ${isLibero ? 'solid' : 'dashed'} ${draggedIndex === cellIndex ? '#229954' : '#bdc3c7'}`,
                                    borderRadius: '4px',
                                    padding: '0.75rem',
                                    backgroundColor: player ? (draggedIndex === cellIndex ? '#229954' : '#27ae60') : 'white',
                                    color: player ? 'white' : '#7f8c8d',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    transition: 'background-color 0.2s, border-color 0.2s',
                                    opacity: draggedIndex === cellIndex ? 0.6 : 1,
                                }, onDragEnter: (e) => {
                                    if (!player && draggedIndex !== null) {
                                        e.currentTarget.style.backgroundColor = '#d5f4e6';
                                        e.currentTarget.style.borderColor = '#27ae60';
                                        e.currentTarget.style.borderStyle = 'solid';
                                    }
                                }, onDragLeave: (e) => {
                                    if (!player) {
                                        e.currentTarget.style.backgroundColor = 'white';
                                        e.currentTarget.style.borderColor = '#bdc3c7';
                                        e.currentTarget.style.borderStyle = isLibero ? 'solid' : 'dashed';
                                    }
                                }, children: [_jsx("div", { style: {
                                            position: 'absolute',
                                            top: '0.25rem',
                                            left: '0.5rem',
                                            fontSize: '0.85rem',
                                            fontWeight: 'bold',
                                            opacity: 0.7,
                                        }, children: isLibero ? liberoLabels[cellIndex - 6] : romanNumerals[cellIndex] }), player ? (_jsxs("div", { draggable: true, onDragStart: (e) => handleDragStart(e, cellIndex), onDragEnd: handleDragEnd, style: {
                                            width: '100%',
                                            textAlign: 'center',
                                            fontWeight: 'bold',
                                            cursor: 'move',
                                            userSelect: 'none',
                                        }, children: [player.number != null ? `№${player.number}` : 'Без номера', " ", player.name] })) : (_jsx("div", { style: {
                                            fontSize: '0.85rem',
                                            textAlign: 'center',
                                            opacity: 0.5,
                                        }, children: isLibero ? liberoLabels[cellIndex - 6] : 'Пусто' }))] }, `cell-${cellIndex}`));
                        }) })] })), _jsxs("div", { style: {
                    display: 'flex',
                    gap: '1rem',
                    justifyContent: 'flex-end',
                }, children: [_jsx("button", { onClick: handleCancel, style: {
                            padding: '0.75rem 1.5rem',
                            fontSize: '1rem',
                            backgroundColor: '#95a5a6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }, children: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C" }), _jsx("button", { onClick: handleSave, style: {
                            padding: '0.75rem 1.5rem',
                            fontSize: '1rem',
                            backgroundColor: '#27ae60',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                        }, children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438 \u0432\u0435\u0440\u043D\u0443\u0442\u044C\u0441\u044F" })] })] }));
}
export default RosterManagementPage;
