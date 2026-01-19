import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import WelcomePage from './pages/WelcomePage';
import MatchControlPage from './pages/MatchControlPage';
import MatchSettingsPage from './pages/MatchSettingsPage';
import RosterManagementPage from './pages/RosterManagementPage';
import VMixSettingsPage from './pages/VMixSettingsPage';
import MobileAccessPage from './pages/MobileAccessPage';
import AboutPage from './pages/AboutPage';
function App() {
    const [currentMatch, setCurrentMatch] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();
    useEffect(() => {
        if (location.state?.match) {
            const matchFromState = location.state.match;
            setCurrentMatch(matchFromState);
            if (window.electronAPI) {
                window.electronAPI.setCurrentMatch(matchFromState).catch(err => {
                    console.error('Ошибка при обновлении матча:', err);
                });
                window.electronAPI.setMobileMatch(matchFromState).catch(err => {
                    console.error('Ошибка при обновлении мобильного матча:', err);
                });
            }
            window.history.replaceState({}, document.title);
        }
    }, [location]);
    useEffect(() => {
        if (!window.electronAPI)
            return;
        const handleNavigate = (path) => {
            navigate(path);
        };
        const handleLoadMatch = (match) => {
            if (match) {
                setCurrentMatch(match);
                if (location.pathname === '/match') {
                }
                else {
                    navigate('/match', { state: { match } });
                }
            }
        };
        const handleRefreshVMix = () => {
            if (currentMatch) {
                navigate('/match', {
                    state: {
                        match: currentMatch,
                        forceUpdateVMix: true
                    }
                });
            }
        };
        const removeNavigate = window.electronAPI.onNavigate?.(handleNavigate);
        const removeLoadMatch = window.electronAPI.onLoadMatch?.(handleLoadMatch);
        const removeRefreshVMix = window.electronAPI.onRefreshVMix?.(handleRefreshVMix);
        return () => {
            removeNavigate?.();
            removeLoadMatch?.();
            removeRefreshVMix?.();
        };
    }, [navigate, currentMatch, location.pathname]);
    return (_jsx(Layout, { match: currentMatch, onMatchChange: setCurrentMatch, children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(WelcomePage, {}) }), _jsx(Route, { path: "/match", element: _jsx(MatchControlPage, { match: currentMatch, onMatchChange: setCurrentMatch }) }), _jsx(Route, { path: "/match/settings", element: _jsx(MatchSettingsPage, { match: currentMatch, onMatchChange: setCurrentMatch }) }), _jsx(Route, { path: "/match/roster", element: _jsx(RosterManagementPage, { match: currentMatch, onMatchChange: setCurrentMatch }) }), _jsx(Route, { path: "/vmix/settings", element: _jsx(VMixSettingsPage, {}) }), _jsx(Route, { path: "/mobile/access", element: _jsx(MobileAccessPage, {}) }), _jsx(Route, { path: "/about", element: _jsx(AboutPage, {}) })] }) }));
}
export default App;
