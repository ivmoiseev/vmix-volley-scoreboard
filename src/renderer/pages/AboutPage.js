import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
function AboutPage() {
    const [version, setVersion] = useState('');
    useEffect(() => {
        loadVersion();
    }, []);
    const loadVersion = async () => {
        try {
            if (window.electronAPI) {
                const appVersion = await window.electronAPI.getVersion();
                setVersion(appVersion);
            }
        }
        catch (error) {
            console.error('Ошибка при загрузке версии:', error);
        }
    };
    return (_jsxs("div", { style: { padding: '2rem', maxWidth: '800px', margin: '0 auto' }, children: [_jsx("h2", { children: "\u041E \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0435" }), _jsxs("div", { style: {
                    backgroundColor: '#ecf0f1',
                    padding: '2rem',
                    borderRadius: '8px',
                    marginTop: '2rem',
                }, children: [_jsx("h3", { style: { marginTop: 0 }, children: "vMix Volley Scoreboard" }), _jsx("p", { style: { fontSize: '1.1rem', marginBottom: '1rem' }, children: "\u041F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0434\u043B\u044F \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u044F \u0441\u0447\u0435\u0442\u043E\u043C \u0432 \u0432\u043E\u043B\u0435\u0439\u0431\u043E\u043B\u044C\u043D\u044B\u0445 \u0442\u0443\u0440\u043D\u0438\u0440\u0430\u0445 \u0441 \u0438\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u0435\u0439 vMix" }), version && (_jsxs("p", { children: [_jsx("strong", { children: "\u0412\u0435\u0440\u0441\u0438\u044F:" }), " ", version] })), _jsxs("div", { style: { marginTop: '2rem' }, children: [_jsx("h4", { children: "\u041E\u0441\u043D\u043E\u0432\u043D\u044B\u0435 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438:" }), _jsxs("ul", { style: { lineHeight: '1.8' }, children: [_jsx("li", { children: "\u0412\u0435\u0434\u0435\u043D\u0438\u0435 \u0441\u0447\u0435\u0442\u0430 \u043C\u0430\u0442\u0447\u0430 \u0441 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438\u043C \u0443\u0447\u0435\u0442\u043E\u043C \u043F\u043E\u0434\u0430\u0447\u0438" }), _jsx("li", { children: "\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u0435\u043D\u0438\u0435 \u0441\u0435\u0442\u0431\u043E\u043B\u0430 \u0438 \u043C\u0430\u0442\u0447\u0431\u043E\u043B\u0430 \u043F\u043E \u043F\u0440\u0430\u0432\u0438\u043B\u0430\u043C \u0412\u0424\u0412" }), _jsx("li", { children: "\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u0430\u044F \u0441\u0442\u0430\u0442\u0438\u0441\u0442\u0438\u043A\u0430 (\u043E\u043F\u0446\u0438\u043E\u043D\u0430\u043B\u044C\u043D\u043E)" }), _jsx("li", { children: "\u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0441\u043E\u0441\u0442\u0430\u0432\u0430\u043C\u0438 \u043A\u043E\u043C\u0430\u043D\u0434 \u0441 \u043B\u043E\u0433\u043E\u0442\u0438\u043F\u0430\u043C\u0438" }), _jsx("li", { children: "\u0418\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u044F \u0441 vMix \u0434\u043B\u044F \u043E\u0442\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u043F\u043B\u0430\u0448\u0435\u043A" }), _jsx("li", { children: "\u041C\u043E\u0431\u0438\u043B\u044C\u043D\u044B\u0439 \u0434\u043E\u0441\u0442\u0443\u043F \u0447\u0435\u0440\u0435\u0437 Wi-Fi" }), _jsx("li", { children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435 \u043C\u0430\u0442\u0447\u0435\u0439 \u0432 JSON \u0444\u043E\u0440\u043C\u0430\u0442\u0435" })] })] }), _jsxs("div", { style: { marginTop: '2rem' }, children: [_jsx("h4", { children: "\u0422\u0435\u0445\u043D\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u0438\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F:" }), _jsxs("ul", { style: { lineHeight: '1.8' }, children: [_jsxs("li", { children: [_jsx("strong", { children: "\u041F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u0430:" }), " Electron"] }), _jsxs("li", { children: [_jsx("strong", { children: "\u0418\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441:" }), " React"] }), _jsxs("li", { children: [_jsx("strong", { children: "\u0421\u0435\u0440\u0432\u0435\u0440:" }), " Express"] }), _jsxs("li", { children: [_jsx("strong", { children: "\u0424\u043E\u0440\u043C\u0430\u0442 \u0434\u0430\u043D\u043D\u044B\u0445:" }), " JSON"] })] })] }), _jsxs("div", { style: { marginTop: '2rem', padding: '1rem', backgroundColor: '#fff', borderRadius: '4px' }, children: [_jsx("h4", { children: "\u041B\u0438\u0446\u0435\u043D\u0437\u0438\u044F:" }), _jsx("p", { children: "\u0421\u043C. \u0444\u0430\u0439\u043B LICENSE \u0432 \u043A\u043E\u0440\u043D\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u0430" })] }), _jsx("div", { style: { marginTop: '2rem', textAlign: 'center', color: '#7f8c8d' }, children: _jsx("p", { children: "\u00A9 2024 vMix Volley Scoreboard" }) })] })] }));
}
export default AboutPage;
