import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
function WelcomePage() {
    const navigate = useNavigate();
    const [vmixStatus, setVMixStatus] = useState({
        connected: false,
        message: 'Не подключено',
    });
    useEffect(() => {
        checkVMixStatus();
        const interval = setInterval(checkVMixStatus, 5000);
        return () => clearInterval(interval);
    }, []);
    const checkVMixStatus = async () => {
        try {
            if (!window.electronAPI) {
                return;
            }
            const config = await window.electronAPI.getVMixConfig();
            if (config && config.host) {
                const result = await window.electronAPI.testVMixConnection(config.host, config.port);
                setVMixStatus({
                    connected: result.success,
                    message: result.success ? 'Подключено' : 'Не подключено',
                });
            }
        }
        catch (error) {
            console.error('Ошибка при проверке статуса vMix:', error);
        }
    };
    const handleCreateMatch = async () => {
        try {
            if (!window.electronAPI) {
                alert('Electron API недоступен');
                return;
            }
            const match = await window.electronAPI.createMatch();
            if (!match) {
                alert('Не удалось создать матч: матч не был создан');
                return;
            }
            navigate('/match', { state: { match } });
        }
        catch (error) {
            console.error('Ошибка при создании матча:', error);
            alert('Не удалось создать матч: ' + error.message);
        }
    };
    const handleOpenMatch = async () => {
        try {
            if (!window.electronAPI) {
                alert('Electron API недоступен');
                return;
            }
            const match = await window.electronAPI.openMatchDialog();
            if (match) {
                navigate('/match', { state: { match } });
            }
        }
        catch (error) {
            console.error('Ошибка при открытии матча:', error);
            alert('Не удалось открыть матч: ' + error.message);
        }
    };
    return (_jsxs("div", { style: {
            maxWidth: '700px',
            margin: '0 auto',
            padding: '2rem',
        }, children: [_jsxs("div", { style: { textAlign: 'center', marginBottom: '3rem' }, children: [_jsx("h1", { style: { fontSize: '2.5rem', marginBottom: '0.5rem', color: '#2c3e50' }, children: "vMix Volley Scoreboard" }), _jsx("p", { style: { fontSize: '1.2rem', color: '#7f8c8d' }, children: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0441\u0447\u0435\u0442\u043E\u043C \u0432\u043E\u043B\u0435\u0439\u0431\u043E\u043B\u044C\u043D\u044B\u0445 \u043C\u0430\u0442\u0447\u0435\u0439" })] }), _jsxs("div", { style: {
                    backgroundColor: '#ecf0f1',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    marginBottom: '2rem',
                }, children: [_jsx("h3", { style: { marginTop: 0 }, children: "\u0421\u0442\u0430\u0442\u0443\u0441 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '1rem' }, children: [_jsx("div", { style: {
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    backgroundColor: vmixStatus.connected ? '#27ae60' : '#e74c3c',
                                } }), _jsxs("span", { children: [_jsx("strong", { children: "vMix:" }), " ", vmixStatus.message] })] }), !vmixStatus.connected && (_jsx("p", { style: { marginTop: '0.5rem', fontSize: '0.9rem', color: '#7f8c8d' }, children: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u0442\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u043A vMix \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F" }))] }), _jsxs("div", { style: {
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    marginBottom: '2rem',
                }, children: [_jsx("button", { onClick: handleCreateMatch, style: {
                            padding: '1.5rem 2rem',
                            fontSize: '1.2rem',
                            backgroundColor: '#3498db',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 10px rgba(52, 152, 219, 0.3)',
                            transition: 'transform 0.1s',
                        }, onMouseEnter: (e) => e.currentTarget.style.transform = 'scale(1.02)', onMouseLeave: (e) => e.currentTarget.style.transform = 'scale(1)', children: "\u2795 \u0421\u043E\u0437\u0434\u0430\u0442\u044C \u043D\u043E\u0432\u044B\u0439 \u043C\u0430\u0442\u0447" }), _jsx("button", { onClick: handleOpenMatch, style: {
                            padding: '1.5rem 2rem',
                            fontSize: '1.2rem',
                            backgroundColor: '#95a5a6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 10px rgba(149, 165, 166, 0.3)',
                            transition: 'transform 0.1s',
                        }, onMouseEnter: (e) => e.currentTarget.style.transform = 'scale(1.02)', onMouseLeave: (e) => e.currentTarget.style.transform = 'scale(1)', children: "\uD83D\uDCC2 \u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0439 \u043C\u0430\u0442\u0447" })] }), _jsxs("div", { style: {
                    backgroundColor: '#fff3cd',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #ffc107',
                }, children: [_jsx("h4", { style: { marginTop: 0 }, children: "\u0411\u044B\u0441\u0442\u0440\u044B\u0439 \u0441\u0442\u0430\u0440\u0442:" }), _jsxs("ol", { style: { margin: 0, paddingLeft: '1.5rem', lineHeight: '1.8' }, children: [_jsx("li", { children: "\u0421\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043D\u043E\u0432\u044B\u0439 \u043C\u0430\u0442\u0447 \u0438\u043B\u0438 \u043E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0439" }), _jsx("li", { children: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u0442\u0435 \u043F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B \u043C\u0430\u0442\u0447\u0430 (\u043A\u043E\u043C\u0430\u043D\u0434\u044B, \u0442\u0443\u0440\u043D\u0438\u0440, \u043C\u0435\u0441\u0442\u043E)" }), _jsx("li", { children: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u0442\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u043A vMix (\u0435\u0441\u043B\u0438 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F)" }), _jsx("li", { children: "\u041D\u0430\u0447\u043D\u0438\u0442\u0435 \u0432\u0435\u0434\u0435\u043D\u0438\u0435 \u0441\u0447\u0435\u0442\u0430" })] })] })] }));
}
export default WelcomePage;
