import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { resizeImage } from '../utils/imageResize';
import { useVMix } from '../hooks/useVMix';
import { useHeaderButtons } from '../components/Layout';
function MatchSettingsPage({ match: propMatch, onMatchChange }) {
    const navigate = useNavigate();
    const location = useLocation();
    const matchFromState = location.state?.match;
    const { setButtons } = useHeaderButtons();
    const [match, setMatch] = useState(propMatch || matchFromState || null);
    const { updateMatchData, connectionStatus, resetImageFieldsCache, updateReferee2Data } = useVMix(match);
    const [formData, setFormData] = useState({
        tournament: '',
        tournamentSubtitle: '',
        location: '',
        venue: '',
        date: '',
        time: '',
        timezone: '',
        teamAName: '',
        teamAColor: '#3498db',
        teamALiberoColor: '',
        teamACity: '',
        teamBName: '',
        teamBColor: '#e74c3c',
        teamBLiberoColor: '',
        teamBCity: '',
        referee1: '',
        referee2: '',
        lineJudge1: '',
        lineJudge2: '',
        scorer: '',
    });
    const timezones = [
        { value: 'Europe/Moscow', label: 'Москва (MSK, UTC+3)' },
        { value: 'Europe/Kaliningrad', label: 'Калининград (UTC+2)' },
        { value: 'Europe/Samara', label: 'Самара (UTC+4)' },
        { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (UTC+5)' },
        { value: 'Asia/Omsk', label: 'Омск (UTC+6)' },
        { value: 'Asia/Krasnoyarsk', label: 'Красноярск (UTC+7)' },
        { value: 'Asia/Irkutsk', label: 'Иркутск (UTC+8)' },
        { value: 'Asia/Yakutsk', label: 'Якутск (UTC+9)' },
        { value: 'Asia/Vladivostok', label: 'Владивосток (UTC+10)' },
        { value: 'Asia/Magadan', label: 'Магадан (UTC+11)' },
        { value: 'Asia/Kamchatka', label: 'Камчатка (UTC+12)' },
        { value: 'Europe/Kiev', label: 'Киев (UTC+2)' },
        { value: 'Europe/Minsk', label: 'Минск (UTC+3)' },
        { value: 'Europe/Warsaw', label: 'Варшава (UTC+1/+2)' },
        { value: 'Europe/Berlin', label: 'Берлин (UTC+1/+2)' },
        { value: 'Europe/Paris', label: 'Париж (UTC+1/+2)' },
        { value: 'Europe/London', label: 'Лондон (UTC+0/+1)' },
        { value: 'America/New_York', label: 'Нью-Йорк (UTC-5/-4)' },
        { value: 'America/Los_Angeles', label: 'Лос-Анджелес (UTC-8/-7)' },
        { value: 'Asia/Tokyo', label: 'Токио (UTC+9)' },
        { value: 'Asia/Shanghai', label: 'Шанхай (UTC+8)' },
        { value: 'UTC', label: 'UTC (UTC+0)' },
    ];
    useEffect(() => {
        const loadMatch = async () => {
            if (!match && window.electronAPI) {
                try {
                    if (matchFromState) {
                        setMatch(matchFromState);
                        return;
                    }
                }
                catch (error) {
                    console.error('Ошибка при загрузке матча:', error);
                }
            }
        };
        loadMatch();
    }, []);
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
        const defaultTimezone = typeof Intl !== 'undefined' && Intl.DateTimeFormat
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : 'UTC';
        setFormData({
            tournament: match.tournament || '',
            tournamentSubtitle: match.tournamentSubtitle || '',
            location: match.location || '',
            venue: match.venue || '',
            date: match.date || '',
            time: match.time || '',
            timezone: match.timezone || defaultTimezone,
            teamAName: match.teamA.name || '',
            teamAColor: match.teamA.color || '#3498db',
            teamALiberoColor: match.teamA.liberoColor || '',
            teamACity: match.teamA.city || '',
            teamBName: match.teamB.name || '',
            teamBColor: match.teamB.color || '#e74c3c',
            teamBLiberoColor: match.teamB.liberoColor || '',
            teamBCity: match.teamB.city || '',
            referee1: match.officials?.referee1 || '',
            referee2: match.officials?.referee2 || '',
            lineJudge1: match.officials?.lineJudge1 || '',
            lineJudge2: match.officials?.lineJudge2 || '',
            scorer: match.officials?.scorer || '',
        });
    }, [match, navigate]);
    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value,
        }));
    };
    const handleSave = async () => {
        if (!match)
            return;
        console.log('[MatchSettingsPage handleSave] Текущий match перед сохранением:');
        console.log(`  teamA.name: ${match.teamA?.name || 'N/A'}, logoPath: ${match.teamA?.logoPath || 'N/A'}, logoBase64: ${match.teamA?.logoBase64 ? 'есть' : 'нет'}`);
        console.log(`  teamB.name: ${match.teamB?.name || 'N/A'}, logoPath: ${match.teamB?.logoPath || 'N/A'}, logoBase64: ${match.teamB?.logoBase64 ? 'есть' : 'нет'}`);
        const updatedMatch = {
            ...match,
            tournament: formData.tournament,
            tournamentSubtitle: formData.tournamentSubtitle,
            location: formData.location,
            venue: formData.venue,
            date: formData.date,
            time: formData.time,
            timezone: formData.timezone,
            teamA: {
                ...match.teamA,
                name: formData.teamAName,
                color: formData.teamAColor,
                liberoColor: formData.teamALiberoColor || undefined,
                city: formData.teamACity,
                logo: match.teamA.logo,
                logoPath: match.teamA.logoPath,
                logoBase64: match.teamA.logoBase64,
            },
            teamB: {
                ...match.teamB,
                name: formData.teamBName,
                color: formData.teamBColor,
                liberoColor: formData.teamBLiberoColor || undefined,
                city: formData.teamBCity,
                logo: match.teamB.logo,
                logoPath: match.teamB.logoPath,
                logoBase64: match.teamB.logoBase64,
            },
            officials: {
                referee1: formData.referee1,
                referee2: formData.referee2,
                lineJudge1: formData.lineJudge1,
                lineJudge2: formData.lineJudge2,
                scorer: formData.scorer,
            },
            updatedAt: new Date().toISOString(),
        };
        let finalMatch = updatedMatch;
        if (window.electronAPI) {
            try {
                console.log('[MatchSettingsPage handleSave] До setCurrentMatch:');
                console.log(`  teamA.name: ${updatedMatch.teamA?.name}, logoPath: ${updatedMatch.teamA?.logoPath || 'N/A'}`);
                console.log(`  teamB.name: ${updatedMatch.teamB?.name}, logoPath: ${updatedMatch.teamB?.logoPath || 'N/A'}`);
                const result = await window.electronAPI.setCurrentMatch(updatedMatch);
                if (result && result.match) {
                    finalMatch = result.match;
                    console.log('[MatchSettingsPage handleSave] После setCurrentMatch (обновленный матч):');
                    console.log(`  teamA.name: ${finalMatch.teamA?.name}, logoPath: ${finalMatch.teamA?.logoPath || 'N/A'}`);
                    console.log(`  teamB.name: ${finalMatch.teamB?.name}, logoPath: ${finalMatch.teamB?.logoPath || 'N/A'}`);
                }
                else {
                    console.warn('[MatchSettingsPage handleSave] setCurrentMatch не вернул обновленный матч, используем исходный');
                }
                await window.electronAPI.setMobileMatch(finalMatch);
            }
            catch (error) {
                console.error('Ошибка при сохранении матча:', error);
            }
        }
        if (onMatchChange) {
            onMatchChange(finalMatch);
        }
        setMatch(finalMatch);
        if (connectionStatus.connected) {
            console.log('[MatchSettingsPage handleSave] Обновление данных в vMix:');
            console.log(`  Используемый матч: teamA.name=${finalMatch.teamA?.name}, teamB.name=${finalMatch.teamB?.name}`);
            console.log(`  teamA.logoPath: ${finalMatch.teamA?.logoPath || 'N/A'}`);
            console.log(`  teamB.logoPath: ${finalMatch.teamB?.logoPath || 'N/A'}`);
            console.log(`  teamA.logoBase64: ${finalMatch.teamA?.logoBase64 ? 'есть' : 'нет'}`);
            console.log(`  teamB.logoBase64: ${finalMatch.teamB?.logoBase64 ? 'есть' : 'нет'}`);
            resetImageFieldsCache();
            updateMatchData(finalMatch, true);
            if (updateReferee2Data) {
                try {
                    const result = await updateReferee2Data(finalMatch);
                    if (!result.success) {
                        console.error('Ошибка при обновлении данных судей в плашке 2 судей:', result.error);
                    }
                }
                catch (error) {
                    console.error('Ошибка при обновлении данных судей в плашке 2 судей:', error);
                }
            }
        }
        navigate('/match', { state: { match: finalMatch } });
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
                        }, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { onClick: handleSave, style: {
                            padding: '0.5rem 1rem',
                            backgroundColor: '#27ae60',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                        }, children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F" })] }));
        }
        return () => setButtons(null);
    }, [match, setButtons]);
    if (!match) {
        return null;
    }
    return (_jsxs("div", { style: { padding: '1rem', maxWidth: '1000px', margin: '0 auto' }, children: [_jsx("h2", { children: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043C\u0430\u0442\u0447\u0430" }), _jsxs("div", { style: {
                    backgroundColor: '#ecf0f1',
                    padding: '1.5rem',
                    borderRadius: '4px',
                    marginBottom: '1.5rem',
                }, children: [_jsx("h3", { style: { marginTop: 0 }, children: "\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F \u043E \u0442\u0443\u0440\u043D\u0438\u0440\u0435" }), _jsxs("div", { style: { display: 'grid', gap: '1rem' }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }, children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A (\u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0442\u0443\u0440\u043D\u0438\u0440\u0430)" }), _jsx("input", { type: "text", value: formData.tournament, onChange: (e) => handleInputChange('tournament', e.target.value), style: {
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    fontSize: '1rem',
                                                    border: '1px solid #bdc3c7',
                                                    borderRadius: '4px',
                                                }, placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0442\u0443\u0440\u043D\u0438\u0440\u0430" })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u041F\u043E\u0434\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A (\u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0442\u0443\u0440\u043D\u0438\u0440\u0430)" }), _jsx("input", { type: "text", value: formData.tournamentSubtitle, onChange: (e) => handleInputChange('tournamentSubtitle', e.target.value), style: {
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    fontSize: '1rem',
                                                    border: '1px solid #bdc3c7',
                                                    borderRadius: '4px',
                                                }, placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043F\u043E\u0434\u0437\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u0442\u0443\u0440\u043D\u0438\u0440\u0430" })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }, children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0413\u043E\u0440\u043E\u0434, \u0441\u0442\u0440\u0430\u043D\u0430" }), _jsx("input", { type: "text", value: formData.location, onChange: (e) => handleInputChange('location', e.target.value), style: {
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    fontSize: '1rem',
                                                    border: '1px solid #bdc3c7',
                                                    borderRadius: '4px',
                                                }, placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0433\u043E\u0440\u043E\u0434 \u0438 \u0441\u0442\u0440\u0430\u043D\u0443" })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u041C\u0435\u0441\u0442\u043E \u043F\u0440\u043E\u0432\u0435\u0434\u0435\u043D\u0438\u044F" }), _jsx("input", { type: "text", value: formData.venue, onChange: (e) => handleInputChange('venue', e.target.value), style: {
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    fontSize: '1rem',
                                                    border: '1px solid #bdc3c7',
                                                    borderRadius: '4px',
                                                }, placeholder: "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043C\u0435\u0441\u0442\u043E \u043F\u0440\u043E\u0432\u0435\u0434\u0435\u043D\u0438\u044F" })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }, children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0414\u0430\u0442\u0430 \u043F\u0440\u043E\u0432\u0435\u0434\u0435\u043D\u0438\u044F" }), _jsx("input", { type: "date", value: formData.date, onChange: (e) => handleInputChange('date', e.target.value), style: {
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    fontSize: '1rem',
                                                    border: '1px solid #bdc3c7',
                                                    borderRadius: '4px',
                                                } })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0412\u0440\u0435\u043C\u044F \u043D\u0430\u0447\u0430\u043B\u0430" }), _jsx("input", { type: "time", value: formData.time, onChange: (e) => handleInputChange('time', e.target.value), style: {
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    fontSize: '1rem',
                                                    border: '1px solid #bdc3c7',
                                                    borderRadius: '4px',
                                                } })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0427\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441" }), _jsx("select", { value: formData.timezone, onChange: (e) => handleInputChange('timezone', e.target.value), style: {
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    fontSize: '1rem',
                                                    border: '1px solid #bdc3c7',
                                                    borderRadius: '4px',
                                                    backgroundColor: 'white',
                                                }, children: timezones.map(tz => (_jsx("option", { value: tz.value, children: tz.label }, tz.value))) })] })] })] })] }), _jsxs("div", { style: {
                    backgroundColor: '#ecf0f1',
                    padding: '1.5rem',
                    borderRadius: '4px',
                    marginBottom: '1.5rem',
                }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }, children: [_jsx("h3", { style: { marginTop: 0, marginBottom: 0 }, children: "\u041A\u043E\u043C\u0430\u043D\u0434\u044B" }), _jsxs("button", { onClick: async () => {
                                    if (!match)
                                        return;
                                    if (!window.confirm('Вы уверены, что хотите поменять команды местами? Это действие изменит:\n- Названия команд\n- Цвета команд\n- Логотипы команд\n- Счет в текущей партии\n- Счет во всех завершенных партиях\n- Статистику команд')) {
                                        return;
                                    }
                                    try {
                                        if (window.electronAPI && window.electronAPI.swapTeams) {
                                            console.log('[MatchSettingsPage] До swapTeams:');
                                            console.log(`  teamA.name: ${match.teamA?.name}, logoPath: ${match.teamA?.logoPath || 'N/A'}`);
                                            console.log(`  teamB.name: ${match.teamB?.name}, logoPath: ${match.teamB?.logoPath || 'N/A'}`);
                                            const result = await window.electronAPI.swapTeams(match);
                                            if (result.success) {
                                                const swappedMatch = result.match;
                                                console.log('[MatchSettingsPage] После swapTeams:');
                                                console.log(`  teamA.name: ${swappedMatch.teamA?.name}, logoPath: ${swappedMatch.teamA?.logoPath || 'N/A'}`);
                                                console.log(`  teamB.name: ${swappedMatch.teamB?.name}, logoPath: ${swappedMatch.teamB?.logoPath || 'N/A'}`);
                                                const setCurrentResult = await window.electronAPI.setCurrentMatch(swappedMatch);
                                                let finalSwappedMatch = swappedMatch;
                                                if (setCurrentResult && setCurrentResult.match) {
                                                    finalSwappedMatch = setCurrentResult.match;
                                                    console.log('[MatchSettingsPage] После setCurrentMatch (после swapTeams):');
                                                    console.log(`  teamA.name: ${finalSwappedMatch.teamA?.name}, logoPath: ${finalSwappedMatch.teamA?.logoPath || 'N/A'}`);
                                                    console.log(`  teamB.name: ${finalSwappedMatch.teamB?.name}, logoPath: ${finalSwappedMatch.teamB?.logoPath || 'N/A'}`);
                                                }
                                                await window.electronAPI.setMobileMatch(finalSwappedMatch);
                                                if (onMatchChange) {
                                                    onMatchChange(finalSwappedMatch);
                                                }
                                                setMatch(finalSwappedMatch);
                                                if (connectionStatus.connected) {
                                                    console.log('[MatchSettingsPage] Обновление данных в vMix после swapTeams:');
                                                    console.log(`  Используемый матч: teamA.name=${finalSwappedMatch.teamA?.name}, teamB.name=${finalSwappedMatch.teamB?.name}`);
                                                    console.log(`  teamA.logoPath: ${finalSwappedMatch.teamA?.logoPath || 'N/A'}`);
                                                    console.log(`  teamB.logoPath: ${finalSwappedMatch.teamB?.logoPath || 'N/A'}`);
                                                    resetImageFieldsCache();
                                                    updateMatchData(finalSwappedMatch, true);
                                                }
                                                const defaultTimezone = typeof Intl !== 'undefined' && Intl.DateTimeFormat
                                                    ? Intl.DateTimeFormat().resolvedOptions().timeZone
                                                    : 'UTC';
                                                setFormData({
                                                    tournament: finalSwappedMatch.tournament || '',
                                                    tournamentSubtitle: finalSwappedMatch.tournamentSubtitle || '',
                                                    location: finalSwappedMatch.location || '',
                                                    venue: finalSwappedMatch.venue || '',
                                                    date: finalSwappedMatch.date || '',
                                                    time: finalSwappedMatch.time || '',
                                                    timezone: finalSwappedMatch.timezone || defaultTimezone,
                                                    teamAName: finalSwappedMatch.teamA.name || '',
                                                    teamAColor: finalSwappedMatch.teamA.color || '#3498db',
                                                    teamALiberoColor: finalSwappedMatch.teamA.liberoColor || '',
                                                    teamACity: finalSwappedMatch.teamA.city || '',
                                                    teamBName: finalSwappedMatch.teamB.name || '',
                                                    teamBColor: finalSwappedMatch.teamB.color || '#e74c3c',
                                                    teamBLiberoColor: finalSwappedMatch.teamB.liberoColor || '',
                                                    teamBCity: finalSwappedMatch.teamB.city || '',
                                                    referee1: finalSwappedMatch.officials?.referee1 || '',
                                                    referee2: finalSwappedMatch.officials?.referee2 || '',
                                                    lineJudge1: finalSwappedMatch.officials?.lineJudge1 || '',
                                                    lineJudge2: finalSwappedMatch.officials?.lineJudge2 || '',
                                                    scorer: finalSwappedMatch.officials?.scorer || '',
                                                });
                                                alert('Команды успешно поменяны местами!');
                                            }
                                            else {
                                                alert('Ошибка при смене команд: ' + (result.error || 'Неизвестная ошибка'));
                                            }
                                        }
                                        else {
                                            alert('Electron API недоступен');
                                        }
                                    }
                                    catch (error) {
                                        console.error('Ошибка при смене команд:', error);
                                        alert('Ошибка при смене команд: ' + error.message);
                                    }
                                }, style: {
                                    padding: '0.75rem 1.5rem',
                                    fontSize: '1rem',
                                    backgroundColor: '#f39c12',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }, title: "\u041F\u043E\u043C\u0435\u043D\u044F\u0442\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u043C\u0435\u0441\u0442\u0430\u043C\u0438 (A \u2194 B)", children: [_jsx("span", { children: "\u21C4" }), "\u041F\u043E\u043C\u0435\u043D\u044F\u0442\u044C \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u043C\u0435\u0441\u0442\u0430\u043C\u0438"] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }, children: [_jsxs("div", { children: [_jsx("h4", { children: "\u041A\u043E\u043C\u0430\u043D\u0434\u0430 \u0410" }), _jsxs("div", { style: { display: 'grid', gap: '1rem' }, children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B" }), _jsx("input", { type: "text", value: formData.teamAName, onChange: (e) => handleInputChange('teamAName', e.target.value), style: {
                                                            width: '100%',
                                                            padding: '0.5rem',
                                                            fontSize: '1rem',
                                                            border: '1px solid #bdc3c7',
                                                            borderRadius: '4px',
                                                        }, placeholder: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B" })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0426\u0432\u0435\u0442 \u0444\u043E\u0440\u043C\u044B \u0438\u0433\u0440\u043E\u043A\u043E\u0432" }), _jsxs("div", { style: { display: 'flex', gap: '0.5rem', alignItems: 'center' }, children: [_jsx("input", { type: "color", value: formData.teamAColor, onChange: (e) => handleInputChange('teamAColor', e.target.value), style: {
                                                                    width: '60px',
                                                                    height: '40px',
                                                                    border: '1px solid #bdc3c7',
                                                                    borderRadius: '4px',
                                                                    cursor: 'pointer',
                                                                } }), _jsx("input", { type: "text", value: formData.teamAColor, onChange: (e) => handleInputChange('teamAColor', e.target.value), style: {
                                                                    flex: 1,
                                                                    padding: '0.5rem',
                                                                    fontSize: '1rem',
                                                                    border: '1px solid #bdc3c7',
                                                                    borderRadius: '4px',
                                                                }, placeholder: "#3498db" })] })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0426\u0432\u0435\u0442 \u0444\u043E\u0440\u043C\u044B \u043B\u0438\u0431\u0435\u0440\u043E" }), _jsxs("div", { style: { display: 'flex', gap: '0.5rem', alignItems: 'center' }, children: [_jsx("input", { type: "color", value: formData.teamALiberoColor || '#ffffff', onChange: (e) => handleInputChange('teamALiberoColor', e.target.value), style: {
                                                                    width: '60px',
                                                                    height: '40px',
                                                                    border: '1px solid #bdc3c7',
                                                                    borderRadius: '4px',
                                                                    cursor: 'pointer',
                                                                } }), _jsx("input", { type: "text", value: formData.teamALiberoColor || '', onChange: (e) => handleInputChange('teamALiberoColor', e.target.value), style: {
                                                                    flex: 1,
                                                                    padding: '0.5rem',
                                                                    fontSize: '1rem',
                                                                    border: '1px solid #bdc3c7',
                                                                    borderRadius: '4px',
                                                                }, placeholder: "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D" })] })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0413\u043E\u0440\u043E\u0434" }), _jsx("input", { type: "text", value: formData.teamACity, onChange: (e) => handleInputChange('teamACity', e.target.value), style: {
                                                            width: '100%',
                                                            padding: '0.5rem',
                                                            fontSize: '1rem',
                                                            border: '1px solid #bdc3c7',
                                                            borderRadius: '4px',
                                                        }, placeholder: "\u0413\u043E\u0440\u043E\u0434 \u043A\u043E\u043C\u0430\u043D\u0434\u044B" })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u041B\u043E\u0433\u043E\u0442\u0438\u043F \u043A\u043E\u043C\u0430\u043D\u0434\u044B" }), _jsxs("div", { style: { display: 'flex', gap: '1rem', alignItems: 'center' }, children: [match?.teamA?.logo && (_jsx("img", { src: match.teamA.logo, alt: "\u041B\u043E\u0433\u043E\u0442\u0438\u043F \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0410", style: {
                                                                    width: '100px',
                                                                    height: '100px',
                                                                    objectFit: 'contain',
                                                                    backgroundColor: 'white',
                                                                    padding: '0.5rem',
                                                                    borderRadius: '4px',
                                                                    border: '1px solid #bdc3c7',
                                                                } })), _jsxs("div", { style: { display: 'flex', gap: '0.5rem', flexDirection: 'column' }, children: [_jsxs("label", { style: {
                                                                            padding: '0.5rem 1rem',
                                                                            backgroundColor: '#3498db',
                                                                            color: 'white',
                                                                            borderRadius: '4px',
                                                                            cursor: 'pointer',
                                                                            display: 'inline-block',
                                                                            textAlign: 'center',
                                                                        }, children: [match?.teamA?.logo ? 'Изменить' : 'Загрузить', _jsx("input", { type: "file", accept: "image/*", onChange: async (e) => {
                                                                                    const file = e.target.files[0];
                                                                                    if (!file)
                                                                                        return;
                                                                                    const reader = new FileReader();
                                                                                    reader.onload = async (event) => {
                                                                                        try {
                                                                                            const base64 = event.target.result;
                                                                                            const resizedBase64 = await resizeImage(base64, 240);
                                                                                            if (window.electronAPI && window.electronAPI.saveLogoToFile) {
                                                                                                const result = await window.electronAPI.saveLogoToFile('A', resizedBase64);
                                                                                                if (result.success) {
                                                                                                    const updatedMatch = {
                                                                                                        ...match,
                                                                                                        teamA: {
                                                                                                            ...match.teamA,
                                                                                                            logo: resizedBase64,
                                                                                                            logoBase64: result.logoBase64,
                                                                                                            logoPath: result.logoPath,
                                                                                                        },
                                                                                                        updatedAt: new Date().toISOString(),
                                                                                                    };
                                                                                                    setMatch(updatedMatch);
                                                                                                    if (window.electronAPI.setCurrentMatch) {
                                                                                                        await window.electronAPI.setCurrentMatch(updatedMatch);
                                                                                                    }
                                                                                                }
                                                                                                else {
                                                                                                    throw new Error(result.error || 'Ошибка при сохранении логотипа');
                                                                                                }
                                                                                            }
                                                                                            else {
                                                                                                const updatedMatch = {
                                                                                                    ...match,
                                                                                                    teamA: {
                                                                                                        ...match.teamA,
                                                                                                        logo: resizedBase64,
                                                                                                    },
                                                                                                    updatedAt: new Date().toISOString(),
                                                                                                };
                                                                                                setMatch(updatedMatch);
                                                                                            }
                                                                                        }
                                                                                        catch (error) {
                                                                                            console.error('Ошибка при обработке изображения:', error);
                                                                                            alert('Ошибка при загрузке изображения: ' + error.message);
                                                                                        }
                                                                                    };
                                                                                    reader.readAsDataURL(file);
                                                                                }, style: { display: 'none' } })] }), match?.teamA?.logo && (_jsx("button", { onClick: async () => {
                                                                            if (window.electronAPI && window.electronAPI.deleteLogo) {
                                                                                await window.electronAPI.deleteLogo('A');
                                                                            }
                                                                            const updatedMatch = {
                                                                                ...match,
                                                                                teamA: {
                                                                                    ...match.teamA,
                                                                                    logo: undefined,
                                                                                    logoBase64: undefined,
                                                                                    logoPath: undefined,
                                                                                },
                                                                                updatedAt: new Date().toISOString(),
                                                                            };
                                                                            setMatch(updatedMatch);
                                                                            if (window.electronAPI.setCurrentMatch) {
                                                                                await window.electronAPI.setCurrentMatch(updatedMatch);
                                                                            }
                                                                            if (connectionStatus.connected) {
                                                                                resetImageFieldsCache();
                                                                                updateMatchData(updatedMatch, true);
                                                                            }
                                                                        }, style: {
                                                                            padding: '0.5rem 1rem',
                                                                            backgroundColor: '#e74c3c',
                                                                            color: 'white',
                                                                            border: 'none',
                                                                            borderRadius: '4px',
                                                                            cursor: 'pointer',
                                                                        }, children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" }))] })] })] })] })] }), _jsxs("div", { children: [_jsx("h4", { children: "\u041A\u043E\u043C\u0430\u043D\u0434\u0430 \u0411" }), _jsxs("div", { style: { display: 'grid', gap: '1rem' }, children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B" }), _jsx("input", { type: "text", value: formData.teamBName, onChange: (e) => handleInputChange('teamBName', e.target.value), style: {
                                                            width: '100%',
                                                            padding: '0.5rem',
                                                            fontSize: '1rem',
                                                            border: '1px solid #bdc3c7',
                                                            borderRadius: '4px',
                                                        }, placeholder: "\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043A\u043E\u043C\u0430\u043D\u0434\u044B" })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0426\u0432\u0435\u0442 \u0444\u043E\u0440\u043C\u044B \u0438\u0433\u0440\u043E\u043A\u043E\u0432" }), _jsxs("div", { style: { display: 'flex', gap: '0.5rem', alignItems: 'center' }, children: [_jsx("input", { type: "color", value: formData.teamBColor, onChange: (e) => handleInputChange('teamBColor', e.target.value), style: {
                                                                    width: '60px',
                                                                    height: '40px',
                                                                    border: '1px solid #bdc3c7',
                                                                    borderRadius: '4px',
                                                                    cursor: 'pointer',
                                                                } }), _jsx("input", { type: "text", value: formData.teamBColor, onChange: (e) => handleInputChange('teamBColor', e.target.value), style: {
                                                                    flex: 1,
                                                                    padding: '0.5rem',
                                                                    fontSize: '1rem',
                                                                    border: '1px solid #bdc3c7',
                                                                    borderRadius: '4px',
                                                                }, placeholder: "#e74c3c" })] })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0426\u0432\u0435\u0442 \u0444\u043E\u0440\u043C\u044B \u043B\u0438\u0431\u0435\u0440\u043E" }), _jsxs("div", { style: { display: 'flex', gap: '0.5rem', alignItems: 'center' }, children: [_jsx("input", { type: "color", value: formData.teamBLiberoColor || '#ffffff', onChange: (e) => handleInputChange('teamBLiberoColor', e.target.value), style: {
                                                                    width: '60px',
                                                                    height: '40px',
                                                                    border: '1px solid #bdc3c7',
                                                                    borderRadius: '4px',
                                                                    cursor: 'pointer',
                                                                } }), _jsx("input", { type: "text", value: formData.teamBLiberoColor || '', onChange: (e) => handleInputChange('teamBLiberoColor', e.target.value), style: {
                                                                    flex: 1,
                                                                    padding: '0.5rem',
                                                                    fontSize: '1rem',
                                                                    border: '1px solid #bdc3c7',
                                                                    borderRadius: '4px',
                                                                }, placeholder: "\u041D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D" })] })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0413\u043E\u0440\u043E\u0434" }), _jsx("input", { type: "text", value: formData.teamBCity, onChange: (e) => handleInputChange('teamBCity', e.target.value), style: {
                                                            width: '100%',
                                                            padding: '0.5rem',
                                                            fontSize: '1rem',
                                                            border: '1px solid #bdc3c7',
                                                            borderRadius: '4px',
                                                        }, placeholder: "\u0413\u043E\u0440\u043E\u0434 \u043A\u043E\u043C\u0430\u043D\u0434\u044B" })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u041B\u043E\u0433\u043E\u0442\u0438\u043F \u043A\u043E\u043C\u0430\u043D\u0434\u044B" }), _jsxs("div", { style: { display: 'flex', gap: '1rem', alignItems: 'center' }, children: [match?.teamB?.logo && (_jsx("img", { src: match.teamB.logo, alt: "\u041B\u043E\u0433\u043E\u0442\u0438\u043F \u043A\u043E\u043C\u0430\u043D\u0434\u044B \u0411", style: {
                                                                    width: '100px',
                                                                    height: '100px',
                                                                    objectFit: 'contain',
                                                                    backgroundColor: 'white',
                                                                    padding: '0.5rem',
                                                                    borderRadius: '4px',
                                                                    border: '1px solid #bdc3c7',
                                                                } })), _jsxs("div", { style: { display: 'flex', gap: '0.5rem', flexDirection: 'column' }, children: [_jsxs("label", { style: {
                                                                            padding: '0.5rem 1rem',
                                                                            backgroundColor: '#3498db',
                                                                            color: 'white',
                                                                            borderRadius: '4px',
                                                                            cursor: 'pointer',
                                                                            display: 'inline-block',
                                                                            textAlign: 'center',
                                                                        }, children: [match?.teamB?.logo ? 'Изменить' : 'Загрузить', _jsx("input", { type: "file", accept: "image/*", onChange: async (e) => {
                                                                                    const file = e.target.files[0];
                                                                                    if (!file)
                                                                                        return;
                                                                                    const reader = new FileReader();
                                                                                    reader.onload = async (event) => {
                                                                                        try {
                                                                                            const base64 = event.target.result;
                                                                                            const resizedBase64 = await resizeImage(base64, 240);
                                                                                            if (window.electronAPI && window.electronAPI.saveLogoToFile) {
                                                                                                const result = await window.electronAPI.saveLogoToFile('B', resizedBase64);
                                                                                                if (result.success) {
                                                                                                    const updatedMatch = {
                                                                                                        ...match,
                                                                                                        teamB: {
                                                                                                            ...match.teamB,
                                                                                                            logo: resizedBase64,
                                                                                                            logoBase64: result.logoBase64,
                                                                                                            logoPath: result.logoPath,
                                                                                                        },
                                                                                                        updatedAt: new Date().toISOString(),
                                                                                                    };
                                                                                                    setMatch(updatedMatch);
                                                                                                    if (window.electronAPI.setCurrentMatch) {
                                                                                                        await window.electronAPI.setCurrentMatch(updatedMatch);
                                                                                                    }
                                                                                                    if (connectionStatus.connected) {
                                                                                                        resetImageFieldsCache();
                                                                                                        updateMatchData(updatedMatch, true);
                                                                                                    }
                                                                                                }
                                                                                                else {
                                                                                                    throw new Error(result.error || 'Ошибка при сохранении логотипа');
                                                                                                }
                                                                                            }
                                                                                            else {
                                                                                                const updatedMatch = {
                                                                                                    ...match,
                                                                                                    teamB: {
                                                                                                        ...match.teamB,
                                                                                                        logo: resizedBase64,
                                                                                                    },
                                                                                                    updatedAt: new Date().toISOString(),
                                                                                                };
                                                                                                setMatch(updatedMatch);
                                                                                            }
                                                                                        }
                                                                                        catch (error) {
                                                                                            console.error('Ошибка при обработке изображения:', error);
                                                                                            alert('Ошибка при загрузке изображения: ' + error.message);
                                                                                        }
                                                                                    };
                                                                                    reader.readAsDataURL(file);
                                                                                }, style: { display: 'none' } })] }), match?.teamB?.logo && (_jsx("button", { onClick: async () => {
                                                                            if (window.electronAPI && window.electronAPI.deleteLogo) {
                                                                                await window.electronAPI.deleteLogo('B');
                                                                            }
                                                                            const updatedMatch = {
                                                                                ...match,
                                                                                teamB: {
                                                                                    ...match.teamB,
                                                                                    logo: undefined,
                                                                                    logoBase64: undefined,
                                                                                    logoPath: undefined,
                                                                                },
                                                                                updatedAt: new Date().toISOString(),
                                                                            };
                                                                            setMatch(updatedMatch);
                                                                            if (window.electronAPI.setCurrentMatch) {
                                                                                await window.electronAPI.setCurrentMatch(updatedMatch);
                                                                            }
                                                                            if (connectionStatus.connected) {
                                                                                resetImageFieldsCache();
                                                                                updateMatchData(updatedMatch, true);
                                                                            }
                                                                        }, style: {
                                                                            padding: '0.5rem 1rem',
                                                                            backgroundColor: '#e74c3c',
                                                                            color: 'white',
                                                                            border: 'none',
                                                                            borderRadius: '4px',
                                                                            cursor: 'pointer',
                                                                        }, children: "\u0423\u0434\u0430\u043B\u0438\u0442\u044C" }))] })] })] })] })] })] })] }), _jsxs("div", { style: {
                    backgroundColor: '#ecf0f1',
                    padding: '1.5rem',
                    borderRadius: '4px',
                    marginBottom: '1.5rem',
                }, children: [_jsx("h3", { style: { marginTop: 0 }, children: "\u0421\u0443\u0434\u0435\u0439\u0441\u043A\u0430\u044F \u043A\u043E\u043B\u043B\u0435\u0433\u0438\u044F" }), _jsxs("div", { style: { display: 'grid', gap: '1rem' }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }, children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0413\u043B\u0430\u0432\u043D\u044B\u0439 \u0441\u0443\u0434\u044C\u044F" }), _jsx("input", { type: "text", value: formData.referee1, onChange: (e) => handleInputChange('referee1', e.target.value), style: {
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    fontSize: '1rem',
                                                    border: '1px solid #bdc3c7',
                                                    borderRadius: '4px',
                                                }, placeholder: "\u0418\u043C\u044F \u0433\u043B\u0430\u0432\u043D\u043E\u0433\u043E \u0441\u0443\u0434\u044C\u0438" })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0412\u0442\u043E\u0440\u043E\u0439 \u0441\u0443\u0434\u044C\u044F" }), _jsx("input", { type: "text", value: formData.referee2, onChange: (e) => handleInputChange('referee2', e.target.value), style: {
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    fontSize: '1rem',
                                                    border: '1px solid #bdc3c7',
                                                    borderRadius: '4px',
                                                }, placeholder: "\u0418\u043C\u044F \u0432\u0442\u043E\u0440\u043E\u0433\u043E \u0441\u0443\u0434\u044C\u0438" })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }, children: [_jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0421\u0443\u0434\u044C\u044F \u043D\u0430 \u043B\u0438\u043D\u0438\u0438 1" }), _jsx("input", { type: "text", value: formData.lineJudge1, onChange: (e) => handleInputChange('lineJudge1', e.target.value), style: {
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    fontSize: '1rem',
                                                    border: '1px solid #bdc3c7',
                                                    borderRadius: '4px',
                                                }, placeholder: "\u0418\u043C\u044F \u0441\u0443\u0434\u044C\u0438 \u043D\u0430 \u043B\u0438\u043D\u0438\u0438" })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0421\u0443\u0434\u044C\u044F \u043D\u0430 \u043B\u0438\u043D\u0438\u0438 2" }), _jsx("input", { type: "text", value: formData.lineJudge2, onChange: (e) => handleInputChange('lineJudge2', e.target.value), style: {
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    fontSize: '1rem',
                                                    border: '1px solid #bdc3c7',
                                                    borderRadius: '4px',
                                                }, placeholder: "\u0418\u043C\u044F \u0441\u0443\u0434\u044C\u0438 \u043D\u0430 \u043B\u0438\u043D\u0438\u0438" })] })] }), _jsxs("div", { children: [_jsx("label", { style: { display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }, children: "\u0421\u0435\u043A\u0440\u0435\u0442\u0430\u0440\u044C" }), _jsx("input", { type: "text", value: formData.scorer, onChange: (e) => handleInputChange('scorer', e.target.value), style: {
                                            width: '100%',
                                            padding: '0.5rem',
                                            fontSize: '1rem',
                                            border: '1px solid #bdc3c7',
                                            borderRadius: '4px',
                                        }, placeholder: "\u0418\u043C\u044F \u0441\u0435\u043A\u0440\u0435\u0442\u0430\u0440\u044F" })] })] })] }), _jsxs("div", { style: {
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
                        }, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { onClick: handleSave, style: {
                            padding: '0.75rem 1.5rem',
                            fontSize: '1rem',
                            backgroundColor: '#27ae60',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                        }, children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F" })] })] }));
}
export default MatchSettingsPage;
