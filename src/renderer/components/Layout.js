import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, createContext, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
const HeaderButtonsContext = createContext({
    buttons: null,
    setButtons: () => { },
});
export const useHeaderButtons = () => {
    return useContext(HeaderButtonsContext);
};
function Layout({ children, match, onMatchChange }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const [headerButtons, setHeaderButtons] = useState(null);
    useEffect(() => {
        const loadAutoSaveSettings = async () => {
            if (window.electronAPI && window.electronAPI.getAutoSaveSettings) {
                try {
                    const result = await window.electronAPI.getAutoSaveSettings();
                    if (result.success) {
                        setAutoSaveEnabled(result.enabled);
                    }
                }
                catch (error) {
                    console.error('Ошибка при загрузке настроек автосохранения:', error);
                }
            }
        };
        loadAutoSaveSettings();
        if (window.electronAPI && window.electronAPI.onAutoSaveSettingsChanged) {
            const removeListener = window.electronAPI.onAutoSaveSettingsChanged((enabled) => {
                setAutoSaveEnabled(enabled);
            });
            return () => removeListener?.();
        }
    }, []);
    const handleAutoSaveToggle = async (enabled) => {
        if (window.electronAPI && window.electronAPI.setAutoSaveSettings) {
            try {
                const result = await window.electronAPI.setAutoSaveSettings(enabled);
                if (result.success) {
                    setAutoSaveEnabled(enabled);
                }
                else {
                    alert('Не удалось изменить настройки автосохранения: ' + (result.error || 'Неизвестная ошибка'));
                }
            }
            catch (error) {
                console.error('Ошибка при изменении настроек автосохранения:', error);
                alert('Ошибка при изменении настроек автосохранения: ' + error.message);
            }
        }
    };
    const handleSaveMatch = async () => {
        try {
            if (!window.electronAPI || !match) {
                alert('Electron API недоступен или матч не загружен');
                return;
            }
            const result = await window.electronAPI.saveMatch(match);
            if (result.success) {
                const updatedMatch = { ...match, updatedAt: new Date().toISOString() };
                alert('Матч успешно сохранен!');
                if (onMatchChange) {
                    onMatchChange(updatedMatch);
                }
                if (window.electronAPI.markMatchSaved) {
                    window.electronAPI.markMatchSaved();
                }
            }
        }
        catch (error) {
            console.error('Ошибка при сохранении матча:', error);
            alert('Не удалось сохранить матч: ' + error.message);
        }
    };
    const handleSaveAsMatch = async () => {
        try {
            if (!window.electronAPI || !match) {
                alert('Electron API недоступен или матч не загружен');
                return;
            }
            const result = await window.electronAPI.saveMatchDialog(match);
            if (result.success) {
                const updatedMatch = { ...match, updatedAt: new Date().toISOString() };
                alert('Матч успешно сохранен!');
                if (onMatchChange) {
                    onMatchChange(updatedMatch);
                }
                if (window.electronAPI.markMatchSaved) {
                    window.electronAPI.markMatchSaved();
                }
            }
        }
        catch (error) {
            console.error('Ошибка при сохранении матча:', error);
            alert('Не удалось сохранить матч: ' + error.message);
        }
    };
    if (location.pathname === '/') {
        return (_jsx("div", { style: {
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            }, children: _jsx("main", { style: { flex: 1, padding: '1rem', backgroundColor: '#f5f5f5' }, children: children }) }));
    }
    if (location.pathname === '/match') {
        return (_jsxs("div", { style: {
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            }, children: [_jsx("header", { style: {
                        backgroundColor: '#2c3e50',
                        color: 'white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }, children: _jsxs("div", { style: {
                            padding: '1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            maxWidth: '1600px',
                            margin: '0 auto',
                            width: '100%',
                        }, children: [_jsx("h2", { style: { margin: 0, fontSize: '1.5rem' }, children: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043C\u0430\u0442\u0447\u0435\u043C" }), _jsxs("div", { style: { display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }, children: [_jsxs("label", { style: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            cursor: 'pointer',
                                            fontSize: '0.9rem',
                                            userSelect: 'none',
                                        }, children: [_jsx("input", { type: "checkbox", checked: autoSaveEnabled, onChange: (e) => handleAutoSaveToggle(e.target.checked), style: { cursor: 'pointer' } }), _jsx("span", { children: "\u0410\u0432\u0442\u043E\u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435" })] }), _jsx("button", { onClick: handleSaveMatch, style: {
                                            padding: '0.5rem 1rem',
                                            backgroundColor: '#27ae60',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                        }, children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" }), _jsx("button", { onClick: handleSaveAsMatch, style: {
                                            padding: '0.5rem 1rem',
                                            backgroundColor: '#95a5a6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                        }, children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043A\u0430\u043A..." })] })] }) }), _jsx("main", { style: { flex: 1, padding: '1rem', backgroundColor: '#f5f5f5' }, children: children })] }));
    }
    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/vmix/settings')
            return 'Настройки подключения к vMix';
        if (path === '/match/settings')
            return 'Настройки матча';
        if (path === '/match/roster')
            return 'Управление составами';
        if (path === '/mobile/access')
            return 'Мобильный доступ';
        if (path === '/about')
            return 'О программе';
        return '';
    };
    const pageTitle = getPageTitle();
    return (_jsx(HeaderButtonsContext.Provider, { value: { buttons: headerButtons, setButtons: setHeaderButtons }, children: _jsxs("div", { style: {
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'system-ui, -apple-system, sans-serif'
            }, children: [_jsx("header", { style: {
                        backgroundColor: '#2c3e50',
                        color: 'white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }, children: _jsxs("div", { style: {
                            padding: '1rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                            maxWidth: '1600px',
                            margin: '0 auto',
                            width: '100%',
                        }, children: [pageTitle && (_jsx("h2", { style: { margin: 0, fontSize: '1.5rem' }, children: pageTitle })), _jsx("div", { style: { display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }, children: headerButtons && (_jsx("div", { style: { display: 'flex', gap: '0.5rem', alignItems: 'center' }, children: headerButtons })) })] }) }), _jsx("main", { style: { flex: 1, padding: '1rem', backgroundColor: '#f5f5f5' }, children: children })] }) }));
}
export default Layout;
