import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHeaderButtons } from '../components/Layout';
function MobileAccessPage() {
    const navigate = useNavigate();
    const { setButtons } = useHeaderButtons();
    const [serverInfo, setServerInfo] = useState(null);
    const [sessionData, setSessionData] = useState(null);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [networkInterfaces, setNetworkInterfaces] = useState([]);
    const [selectedIP, setSelectedIP] = useState(null);
    const [savingIP, setSavingIP] = useState(false);
    const sessionLoadedRef = useRef(false);
    useEffect(() => {
        loadServerInfo();
        loadNetworkInterfaces();
        const interval = setInterval(() => {
            loadServerInfo();
        }, 2000);
        return () => clearInterval(interval);
    }, []);
    useEffect(() => {
        if (serverInfo && serverInfo.selectedIP !== undefined) {
            setSelectedIP(serverInfo.selectedIP);
        }
        else if (serverInfo && serverInfo.ip) {
            setSelectedIP(serverInfo.ip);
        }
    }, [serverInfo]);
    useEffect(() => {
        const isServerRunning = serverInfo && serverInfo.running !== false;
        if (networkInterfaces.length > 0 && selectedIP) {
            const found = networkInterfaces.find(iface => iface.ip === selectedIP);
            if (!found) {
                console.warn('Выбранный IP не найден в списке интерфейсов');
                const firstInterface = networkInterfaces.find(iface => !iface.isVpn) || networkInterfaces[0];
                if (firstInterface && !isServerRunning) {
                    setSelectedIP(firstInterface.ip);
                }
            }
        }
        else if (networkInterfaces.length > 0 && !selectedIP && !isServerRunning) {
            const firstInterface = networkInterfaces.find(iface => !iface.isVpn) || networkInterfaces[0];
            if (firstInterface) {
                setSelectedIP(firstInterface.ip);
            }
        }
    }, [networkInterfaces, selectedIP, serverInfo]);
    useEffect(() => {
        if (serverInfo && serverInfo.running !== false && !sessionData && !sessionLoadedRef.current) {
            loadSavedSession();
        }
    }, [serverInfo, sessionData]);
    const loadServerInfo = async () => {
        try {
            if (!window.electronAPI) {
                return;
            }
            const info = await window.electronAPI.getMobileServerInfo();
            setServerInfo(info);
            if (info && info.selectedIP !== undefined) {
                setSelectedIP(info.selectedIP);
            }
        }
        catch (error) {
            console.error('Ошибка при загрузке информации о сервере:', error);
        }
    };
    const loadNetworkInterfaces = async () => {
        try {
            if (!window.electronAPI) {
                return;
            }
            const result = await window.electronAPI.getNetworkInterfaces();
            if (result.success && result.interfaces) {
                setNetworkInterfaces(result.interfaces);
            }
        }
        catch (error) {
            console.error('Ошибка при загрузке сетевых интерфейсов:', error);
        }
    };
    const handleSelectIP = async (ip) => {
        setSelectedIP(ip);
        setSavingIP(true);
        try {
            if (!window.electronAPI) {
                alert('Electron API недоступен');
                return;
            }
            const result = await window.electronAPI.setSelectedIP(ip);
            if (result.success) {
                console.log('Выбранный IP сохранен:', ip);
                await loadServerInfo();
            }
            else {
                alert('Не удалось сохранить выбранный IP: ' + (result.error || 'Неизвестная ошибка'));
                if (serverInfo && serverInfo.selectedIP) {
                    setSelectedIP(serverInfo.selectedIP);
                }
            }
        }
        catch (error) {
            console.error('Ошибка при сохранении выбранного IP:', error);
            alert('Ошибка при сохранении выбранного IP: ' + error.message);
            if (serverInfo && serverInfo.selectedIP) {
                setSelectedIP(serverInfo.selectedIP);
            }
        }
        finally {
            setSavingIP(false);
        }
    };
    const handleSave = async () => {
        if (selectedIP) {
            await handleSelectIP(selectedIP);
            alert('Настройки сохранены!');
        }
    };
    const handleCancel = () => {
        navigate('/match');
    };
    const handleStartServer = async () => {
        setLoading(true);
        try {
            if (!window.electronAPI) {
                alert('Electron API недоступен');
                return;
            }
            const result = await window.electronAPI.startMobileServer(3000);
            if (result.success) {
                setServerInfo(result);
                const savedSession = await window.electronAPI.getSavedMobileSession();
                if (savedSession && savedSession.url) {
                    setSessionData(savedSession);
                    await generateQRCode(savedSession.url);
                }
                else {
                    await generateSession();
                }
            }
            else {
                alert('Не удалось запустить сервер: ' + result.error);
            }
        }
        catch (error) {
            alert('Ошибка: ' + error.message);
        }
        finally {
            setLoading(false);
        }
    };
    const handleStopServer = async () => {
        setLoading(true);
        try {
            if (!window.electronAPI) {
                alert('Electron API недоступен');
                return;
            }
            const result = await window.electronAPI.stopMobileServer();
            if (result.success) {
                setServerInfo(null);
                setSessionData(null);
                setQrCodeDataUrl(null);
                sessionLoadedRef.current = false;
            }
            else {
                alert('Не удалось остановить сервер: ' + result.error);
            }
        }
        catch (error) {
            alert('Ошибка: ' + error.message);
        }
        finally {
            setLoading(false);
        }
    };
    const loadSavedSession = async () => {
        if (sessionLoadedRef.current) {
            return;
        }
        try {
            if (!window.electronAPI) {
                return;
            }
            const savedSession = await window.electronAPI.getSavedMobileSession();
            if (savedSession && savedSession.url) {
                sessionLoadedRef.current = true;
                setSessionData(savedSession);
                await generateQRCode(savedSession.url);
            }
        }
        catch (error) {
            console.error('Ошибка при загрузке сохраненной сессии:', error);
        }
    };
    const generateSession = async () => {
        try {
            if (!window.electronAPI) {
                alert('Electron API недоступен');
                return;
            }
            const result = await window.electronAPI.generateMobileSession();
            if (result.sessionId && result.url) {
                sessionLoadedRef.current = true;
                setSessionData(result);
                await generateQRCode(result.url);
            }
            else {
                alert('Не удалось сгенерировать сессию. Убедитесь, что сервер запущен.');
            }
        }
        catch (error) {
            alert('Ошибка при генерации сессии: ' + error.message);
        }
    };
    const generateQRCode = async (url) => {
        try {
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
            const response = await fetch(qrApiUrl);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = () => {
                setQrCodeDataUrl(reader.result);
            };
            reader.readAsDataURL(blob);
        }
        catch (error) {
            console.error('Ошибка при генерации QR-кода:', error);
            setQrCodeDataUrl(null);
        }
    };
    const copyLinkToClipboard = async () => {
        if (!sessionData || !sessionData.url) {
            return;
        }
        try {
            await navigator.clipboard.writeText(sessionData.url);
            alert('Ссылка скопирована в буфер обмена!');
        }
        catch (error) {
            const textArea = document.createElement('textarea');
            textArea.value = sessionData.url;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                alert('Ссылка скопирована в буфер обмена!');
            }
            catch (err) {
                alert('Не удалось скопировать ссылку');
            }
            document.body.removeChild(textArea);
        }
    };
    const isServerRunning = serverInfo && serverInfo.running !== false;
    useEffect(() => {
        const handleSaveClick = async () => {
            if (selectedIP) {
                await handleSelectIP(selectedIP);
                alert('Настройки сохранены!');
            }
        };
        const handleCancelClick = () => {
            navigate('/match');
        };
        setButtons(_jsxs(_Fragment, { children: [_jsx("button", { onClick: handleCancelClick, style: {
                        padding: '0.5rem 1rem',
                        backgroundColor: '#95a5a6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }, children: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C" }), _jsx("button", { onClick: handleSaveClick, style: {
                        padding: '0.5rem 1rem',
                        backgroundColor: '#27ae60',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                    }, children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] }));
        return () => setButtons(null);
    }, [selectedIP, setButtons, navigate]);
    return (_jsxs("div", { style: { padding: '1rem', maxWidth: '800px', margin: '0 auto' }, children: [_jsx("h2", { children: "\u041C\u043E\u0431\u0438\u043B\u044C\u043D\u044B\u0439 \u0434\u043E\u0441\u0442\u0443\u043F" }), _jsxs("div", { style: {
                    backgroundColor: '#ecf0f1',
                    padding: '1.5rem',
                    borderRadius: '4px',
                    marginBottom: '1.5rem',
                }, children: [_jsx("h3", { style: { marginTop: 0 }, children: "\u0421\u0442\u0430\u0442\u0443\u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u0430" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }, children: [_jsx("div", { style: {
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%',
                                    backgroundColor: isServerRunning ? '#27ae60' : '#e74c3c',
                                } }), _jsx("span", { style: { fontWeight: 'bold' }, children: isServerRunning ? 'Запущен' : 'Остановлен' })] }), _jsxs("div", { style: { marginTop: '1rem', marginBottom: '1rem' }, children: [_jsx("label", { style: {
                                    display: 'block',
                                    marginBottom: '0.5rem',
                                    fontWeight: 'bold',
                                }, children: "\u0421\u0435\u0442\u0435\u0432\u043E\u0439 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441:" }), _jsx("select", { value: selectedIP || '', onChange: (e) => handleSelectIP(e.target.value), disabled: savingIP || isServerRunning, style: {
                                    width: '100%',
                                    maxWidth: '400px',
                                    padding: '0.5rem',
                                    fontSize: '1rem',
                                    border: '1px solid #bdc3c7',
                                    borderRadius: '4px',
                                    backgroundColor: savingIP || isServerRunning ? '#ecf0f1' : 'white',
                                    cursor: savingIP || isServerRunning ? 'not-allowed' : 'pointer',
                                }, children: networkInterfaces.length > 0 ? (networkInterfaces.map((iface, index) => (_jsxs("option", { value: iface.ip, children: [iface.name, " ", iface.isVpn ? '(VPN)' : '', " ", iface.isPrivate ? '' : '(публичный)'] }, index)))) : (_jsx("option", { value: "", children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u043E\u0432..." })) }), _jsx("div", { style: {
                                    marginTop: '0.5rem',
                                    fontSize: '0.85rem',
                                    color: '#7f8c8d',
                                }, children: savingIP ? 'Сохранение...' : isServerRunning ? 'Остановите сервер для изменения интерфейса' : 'Выберите сетевой интерфейс для мобильного сервера' })] }), isServerRunning && serverInfo && (_jsxs("div", { style: { marginTop: '1rem' }, children: [_jsxs("p", { children: [_jsx("strong", { children: "\u0410\u0434\u0440\u0435\u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u0430:" }), " ", serverInfo.url] }), _jsxs("p", { children: [_jsx("strong", { children: "IP \u0430\u0434\u0440\u0435\u0441:" }), " ", serverInfo.ip] }), _jsxs("p", { children: [_jsx("strong", { children: "\u041F\u043E\u0440\u0442:" }), " ", serverInfo.port] }), serverInfo.sessionsCount !== undefined && (_jsxs("p", { children: [_jsx("strong", { children: "\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0445 \u0441\u0435\u0441\u0441\u0438\u0439:" }), " ", serverInfo.sessionsCount] }))] })), _jsx("div", { style: { marginTop: '1rem', display: 'flex', gap: '1rem' }, children: !isServerRunning ? (_jsx("button", { onClick: handleStartServer, disabled: loading, style: {
                                padding: '0.75rem 1.5rem',
                                fontSize: '1rem',
                                backgroundColor: loading ? '#95a5a6' : '#27ae60',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold',
                            }, children: loading ? 'Запуск...' : 'Запустить сервер' })) : (_jsx("button", { onClick: handleStopServer, disabled: loading, style: {
                                padding: '0.75rem 1.5rem',
                                fontSize: '1rem',
                                backgroundColor: loading ? '#95a5a6' : '#e74c3c',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold',
                            }, children: loading ? 'Остановка...' : 'Остановить сервер' })) })] }), isServerRunning && (_jsxs("div", { style: {
                    backgroundColor: '#ecf0f1',
                    padding: '1.5rem',
                    borderRadius: '4px',
                    marginBottom: '1.5rem',
                }, children: [_jsx("h3", { style: { marginTop: 0 }, children: "\u0423\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430 \u0434\u043B\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u0430" }), sessionData && sessionData.url ? (_jsxs(_Fragment, { children: [_jsxs("div", { style: {
                                    backgroundColor: 'white',
                                    padding: '1rem',
                                    borderRadius: '4px',
                                    marginBottom: '1rem',
                                    border: '2px solid #3498db',
                                    wordBreak: 'break-all',
                                }, children: [_jsx("div", { style: { fontSize: '0.9rem', color: '#7f8c8d', marginBottom: '0.5rem' }, children: "\u0421\u0441\u044B\u043B\u043A\u0430 \u0434\u043B\u044F \u043C\u043E\u0431\u0438\u043B\u044C\u043D\u043E\u0433\u043E \u0434\u043E\u0441\u0442\u0443\u043F\u0430:" }), _jsx("div", { style: { fontSize: '1.1rem', fontWeight: 'bold', color: '#2c3e50' }, children: sessionData.url })] }), _jsxs("div", { style: { display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }, children: [_jsx("button", { onClick: copyLinkToClipboard, style: {
                                            padding: '0.75rem 1.5rem',
                                            fontSize: '1rem',
                                            backgroundColor: '#3498db',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                        }, children: "\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0443" }), _jsx("button", { onClick: generateSession, style: {
                                            padding: '0.75rem 1.5rem',
                                            fontSize: '1rem',
                                            backgroundColor: '#9b59b6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                        }, children: "\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043D\u043E\u0432\u0443\u044E \u0441\u0441\u044B\u043B\u043A\u0443" })] }), _jsxs("div", { style: {
                                    textAlign: 'center',
                                    padding: '1rem',
                                    backgroundColor: 'white',
                                    borderRadius: '4px',
                                }, children: [_jsx("h4", { style: { marginTop: 0, marginBottom: '1rem' }, children: "QR-\u043A\u043E\u0434 \u0434\u043B\u044F \u0431\u044B\u0441\u0442\u0440\u043E\u0433\u043E \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F:" }), qrCodeDataUrl ? (_jsx("div", { style: {
                                            display: 'inline-block',
                                            padding: '1rem',
                                            backgroundColor: 'white',
                                            borderRadius: '8px',
                                            border: '2px solid #ecf0f1',
                                        }, children: _jsx("img", { src: qrCodeDataUrl, alt: "QR Code", style: {
                                                width: '300px',
                                                height: '300px',
                                                maxWidth: '100%',
                                            } }) })) : (_jsx("div", { style: {
                                            width: '300px',
                                            height: '300px',
                                            margin: '0 auto',
                                            backgroundColor: '#ecf0f1',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#7f8c8d',
                                        }, children: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 QR-\u043A\u043E\u0434\u0430..." })), _jsx("p", { style: {
                                            marginTop: '1rem',
                                            fontSize: '0.9rem',
                                            color: '#7f8c8d',
                                        }, children: "\u041E\u0442\u0441\u043A\u0430\u043D\u0438\u0440\u0443\u0439\u0442\u0435 QR-\u043A\u043E\u0434 \u043A\u0430\u043C\u0435\u0440\u043E\u0439 \u043C\u043E\u0431\u0438\u043B\u044C\u043D\u043E\u0433\u043E \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430 \u0434\u043B\u044F \u0431\u044B\u0441\u0442\u0440\u043E\u0433\u043E \u0434\u043E\u0441\u0442\u0443\u043F\u0430" })] })] })) : (_jsxs("div", { style: { textAlign: 'center', padding: '2rem' }, children: [_jsx("p", { style: { marginBottom: '1rem', color: '#7f8c8d' }, children: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043A\u043D\u043E\u043F\u043A\u0443 \u0434\u043B\u044F \u0433\u0435\u043D\u0435\u0440\u0430\u0446\u0438\u0438 \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u043E\u0439 \u0441\u0441\u044B\u043B\u043A\u0438 \u0434\u043E\u0441\u0442\u0443\u043F\u0430" }), _jsx("button", { onClick: generateSession, style: {
                                    padding: '0.75rem 1.5rem',
                                    fontSize: '1rem',
                                    backgroundColor: '#27ae60',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                }, children: "\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0443" })] }))] })), _jsxs("div", { style: {
                    backgroundColor: '#fff3cd',
                    padding: '1rem',
                    borderRadius: '4px',
                    border: '1px solid #ffc107',
                }, children: [_jsx("h4", { style: { marginTop: 0 }, children: "\u0418\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F:" }), _jsxs("ol", { style: { margin: 0, paddingLeft: '1.5rem' }, children: [_jsxs("li", { children: [_jsx("strong", { children: "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0441\u0435\u0442\u0435\u0432\u043E\u0439 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441" }), " \u0432 \u0432\u044B\u043F\u0430\u0434\u0430\u044E\u0449\u0435\u043C \u0441\u043F\u0438\u0441\u043A\u0435 \u0432\u044B\u0448\u0435 (\u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441 \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0432 \u0442\u043E\u0439 \u0436\u0435 \u043F\u043E\u0434\u0441\u0435\u0442\u0438, \u0447\u0442\u043E \u0438 vMix)"] }), _jsx("li", { children: "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u0441\u0435\u0440\u0432\u0435\u0440, \u043D\u0430\u0436\u0430\u0432 \u043A\u043D\u043E\u043F\u043A\u0443 \"\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0441\u0435\u0440\u0432\u0435\u0440\"" }), _jsx("li", { children: "\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0439\u0442\u0435 \u0443\u043D\u0438\u043A\u0430\u043B\u044C\u043D\u0443\u044E \u0441\u0441\u044B\u043B\u043A\u0443 \u0434\u043B\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u0430" }), _jsx("li", { children: "\u0421\u043A\u043E\u043F\u0438\u0440\u0443\u0439\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u0438\u043B\u0438 \u043E\u0442\u0441\u043A\u0430\u043D\u0438\u0440\u0443\u0439\u0442\u0435 QR-\u043A\u043E\u0434 \u0441 \u043C\u043E\u0431\u0438\u043B\u044C\u043D\u043E\u0433\u043E \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430" }), _jsx("li", { children: "\u041E\u0442\u043A\u0440\u043E\u0439\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435 \u043C\u043E\u0431\u0438\u043B\u044C\u043D\u043E\u0433\u043E \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u0430" }), _jsx("li", { children: "\u0423\u0431\u0435\u0434\u0438\u0442\u0435\u0441\u044C, \u0447\u0442\u043E \u043C\u043E\u0431\u0438\u043B\u044C\u043D\u043E\u0435 \u0443\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E \u043A \u0442\u043E\u0439 \u0436\u0435 \u0441\u0435\u0442\u0438, \u0447\u0442\u043E \u0438 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u0439 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441" })] }), _jsxs("div", { style: {
                            marginTop: '1rem',
                            padding: '0.75rem',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '4px',
                            fontSize: '0.9rem',
                        }, children: [_jsx("strong", { children: "\u0412\u0430\u0436\u043D\u043E:" }), " \u0415\u0441\u043B\u0438 \u0432\u044B \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0438 \u0441\u0435\u0442\u0435\u0432\u043E\u0439 \u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441, \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0438 \u0437\u0430\u043D\u043E\u0432\u043E \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C \u0441\u0435\u0440\u0432\u0435\u0440 \u0434\u043B\u044F \u043F\u0440\u0438\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0439."] })] }), _jsxs("div", { style: { marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }, children: [_jsx("button", { onClick: () => navigate('/match'), style: {
                            padding: '0.75rem 1.5rem',
                            fontSize: '1rem',
                            backgroundColor: '#95a5a6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                        }, children: "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C" }), _jsx("button", { onClick: async () => {
                            if (selectedIP) {
                                await handleSelectIP(selectedIP);
                                alert('Настройки сохранены!');
                            }
                        }, style: {
                            padding: '0.75rem 1.5rem',
                            fontSize: '1rem',
                            backgroundColor: '#27ae60',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                        }, children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] })] }));
}
export default MobileAccessPage;
