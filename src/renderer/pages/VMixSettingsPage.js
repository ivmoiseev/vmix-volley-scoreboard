import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getFullFieldName } from "../utils/vmix-field-utils";
import { useHeaderButtons } from "../components/Layout";
function VMixSettingsPage() {
    const navigate = useNavigate();
    const { setButtons } = useHeaderButtons();
    const [config, setConfig] = useState({
        host: "localhost",
        port: 8088,
        inputs: {
            lineup: { name: "Input1", overlay: 1 },
            statistics: { name: "Input2", overlay: 1 },
            rosterTeamA: { name: "Input3", overlay: 1 },
            rosterTeamB: { name: "Input4", overlay: 1 },
            startingLineupTeamA: { name: "Input5", overlay: 1 },
            startingLineupTeamB: { name: "Input6", overlay: 1 },
            currentScore: { name: "Input7", overlay: 1 },
            set1Score: { name: "Input8", overlay: 1 },
            set2Score: { name: "Input9", overlay: 1 },
            set3Score: { name: "Input10", overlay: 1 },
            set4Score: { name: "Input11", overlay: 1 },
            set5Score: { name: "Input12", overlay: 1 },
            referee1: { name: "Input13", overlay: 1 },
            referee2: { name: "Input14", overlay: 1 },
        },
    });
    const [connectionStatus, setConnectionStatus] = useState({
        connected: false,
        testing: false,
        message: "",
    });
    useEffect(() => {
        loadConfig();
    }, []);
    useEffect(() => {
        if (config.inputs &&
            Object.keys(config.inputs).length > 0 &&
            !selectedInput) {
            const firstInputKey = Object.keys(config.inputs)[0];
            setSelectedInput(firstInputKey);
        }
    }, [config.inputs]);
    const handleSave = useCallback(async () => {
        try {
            if (!window.electronAPI) {
                alert("Electron API недоступен");
                return;
            }
            await window.electronAPI.setVMixConfig(config);
            alert("Настройки сохранены!");
            navigate("/match");
        }
        catch (error) {
            console.error("Ошибка при сохранении настроек:", error);
            alert("Не удалось сохранить настройки: " + error.message);
        }
    }, [config, navigate]);
    useEffect(() => {
        setButtons(_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => navigate("/match"), style: {
                        padding: "0.5rem 1rem",
                        backgroundColor: "#95a5a6",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                    }, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { onClick: handleSave, style: {
                        padding: "0.5rem 1rem",
                        backgroundColor: "#27ae60",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: "bold",
                    }, children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C" })] }));
        return () => setButtons(null);
    }, [setButtons, navigate, handleSave]);
    const loadConfig = async () => {
        try {
            if (!window.electronAPI) {
                return;
            }
            const savedConfig = await window.electronAPI.getVMixConfig();
            if (savedConfig) {
                setConfig(savedConfig);
            }
        }
        catch (error) {
            console.error("Ошибка при загрузке настроек vMix:", error);
        }
    };
    const handleInputChange = (field, value) => {
        if (field.includes(".")) {
            const parts = field.split(".");
            if (parts.length === 2) {
                const [parent, child] = parts;
                setConfig((prev) => ({
                    ...prev,
                    [parent]: {
                        ...prev[parent],
                        [child]: child === "port" ? parseInt(value) || 8088 : value,
                    },
                }));
            }
            else if (parts.length === 3) {
                const [parent, key, property] = parts;
                setConfig((prev) => ({
                    ...prev,
                    [parent]: {
                        ...prev[parent],
                        [key]: {
                            ...prev[parent][key],
                            [property]: property === "overlay" || property === "enabled"
                                ? property === "overlay"
                                    ? parseInt(value) || 1
                                    : value === true || value === "true"
                                : value,
                        },
                    },
                }));
            }
            else if (parts.length === 5) {
                const [parent, inputKey, fieldsKey, fieldKey2, property] = parts;
                setConfig((prev) => ({
                    ...prev,
                    [parent]: {
                        ...prev[parent],
                        [inputKey]: {
                            ...prev[parent][inputKey],
                            [fieldsKey]: {
                                ...prev[parent][inputKey][fieldsKey],
                                [fieldKey2]: {
                                    ...prev[parent][inputKey][fieldsKey][fieldKey2],
                                    [property]: property === "enabled"
                                        ? value === true || value === "true"
                                        : value,
                                },
                            },
                        },
                    },
                }));
            }
        }
        else {
            setConfig((prev) => ({
                ...prev,
                [field]: field === "port" ? parseInt(value) || 8088 : value,
            }));
        }
    };
    const handleTestConnection = async () => {
        setConnectionStatus({
            connected: false,
            testing: true,
            message: "Проверка подключения...",
        });
        try {
            if (!window.electronAPI) {
                setConnectionStatus({
                    connected: false,
                    testing: false,
                    message: "Electron API недоступен",
                });
                return;
            }
            const result = await window.electronAPI.testVMixConnection(config.host, config.port);
            if (result.success) {
                setConnectionStatus({
                    connected: true,
                    testing: false,
                    message: "Подключение успешно!",
                });
            }
            else {
                setConnectionStatus({
                    connected: false,
                    testing: false,
                    message: result.error || "Не удалось подключиться к vMix",
                });
            }
        }
        catch (error) {
            setConnectionStatus({
                connected: false,
                testing: false,
                message: "Ошибка: " + error.message,
            });
        }
    };
    const inputLabels = {
        lineup: "Заявка (TeamA vs TeamB)",
        statistics: "Статистика",
        rosterTeamA: "Состав команды А (полный)",
        rosterTeamB: "Состав команды Б (полный)",
        startingLineupTeamA: "Стартовый состав команды А",
        startingLineupTeamB: "Стартовый состав команды Б",
        currentScore: "Текущий счет (во время партии)",
        set1Score: "Счет после 1 партии",
        set2Score: "Счет после 2 партии",
        set3Score: "Счет после 3 партии",
        set4Score: "Счет после 4 партии",
        set5Score: "Счет после 5 партии",
        referee1: "Плашка общая",
        referee2: "Плашка 2 судьи",
    };
    const [selectedInput, setSelectedInput] = useState(null);
    return (_jsxs("div", { style: { padding: "1rem", maxWidth: "1000px", margin: "0 auto" }, children: [_jsxs("div", { style: {
                    backgroundColor: "#ecf0f1",
                    padding: "1.5rem",
                    borderRadius: "4px",
                    marginBottom: "1.5rem",
                }, children: [_jsx("h3", { style: { marginTop: 0 }, children: "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435" }), _jsxs("div", { style: { display: "grid", gap: "1rem" }, children: [_jsxs("div", { children: [_jsx("label", { style: {
                                            display: "block",
                                            marginBottom: "0.5rem",
                                            fontWeight: "bold",
                                        }, children: "IP \u0430\u0434\u0440\u0435\u0441 vMix" }), _jsx("input", { type: "text", value: config.host, onChange: (e) => handleInputChange("host", e.target.value), style: {
                                            width: "100%",
                                            maxWidth: "300px",
                                            padding: "0.5rem",
                                            fontSize: "1rem",
                                            border: "1px solid #bdc3c7",
                                            borderRadius: "4px",
                                        }, placeholder: "192.168.1.100" })] }), _jsxs("div", { children: [_jsx("label", { style: {
                                            display: "block",
                                            marginBottom: "0.5rem",
                                            fontWeight: "bold",
                                        }, children: "\u041F\u043E\u0440\u0442" }), _jsx("input", { type: "number", value: config.port, onChange: (e) => handleInputChange("port", parseInt(e.target.value) || 8088), style: {
                                            width: "100%",
                                            maxWidth: "150px",
                                            padding: "0.5rem",
                                            fontSize: "1rem",
                                            border: "1px solid #bdc3c7",
                                            borderRadius: "4px",
                                        }, placeholder: "8088" })] }), _jsxs("div", { children: [_jsx("button", { onClick: handleTestConnection, disabled: connectionStatus.testing, style: {
                                            padding: "0.75rem 1.5rem",
                                            fontSize: "1rem",
                                            backgroundColor: connectionStatus.testing
                                                ? "#95a5a6"
                                                : "#3498db",
                                            color: "white",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: connectionStatus.testing ? "not-allowed" : "pointer",
                                        }, children: connectionStatus.testing ? "Проверка..." : "Тест подключения" }), connectionStatus.message && (_jsx("span", { style: {
                                            marginLeft: "1rem",
                                            color: connectionStatus.connected ? "#27ae60" : "#e74c3c",
                                            fontWeight: "bold",
                                        }, children: connectionStatus.message }))] })] })] }), _jsxs("div", { style: {
                    backgroundColor: "#ecf0f1",
                    padding: "1.5rem",
                    borderRadius: "4px",
                    marginBottom: "1.5rem",
                }, children: [_jsx("h3", { style: { marginTop: 0, marginBottom: "1rem" }, children: "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430 \u0438\u043D\u043F\u0443\u0442\u043E\u0432" }), _jsxs("div", { style: { display: "flex", gap: "1rem", minHeight: "500px" }, children: [_jsx("div", { style: {
                                    width: "250px",
                                    backgroundColor: "white",
                                    borderRadius: "4px",
                                    padding: "0.5rem",
                                    border: "1px solid #bdc3c7",
                                    overflowY: "auto",
                                    maxHeight: "600px",
                                }, children: Object.keys(inputLabels).map((key) => {
                                    const input = config.inputs[key] || {};
                                    const isEnabled = input.enabled !== false;
                                    const isSelected = selectedInput === key;
                                    return (_jsxs("div", { onClick: () => setSelectedInput(key), style: {
                                            padding: "0.75rem",
                                            marginBottom: "0.25rem",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                            backgroundColor: isSelected
                                                ? "#3498db"
                                                : isEnabled
                                                    ? "white"
                                                    : "#ecf0f1",
                                            color: isSelected ? "white" : "#2c3e50",
                                            border: `1px solid ${isSelected ? "#2980b9" : "#bdc3c7"}`,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.5rem",
                                        }, children: [_jsx("input", { type: "checkbox", checked: isEnabled, onChange: (e) => {
                                                    e.stopPropagation();
                                                    handleInputChange(`inputs.${key}.enabled`, e.target.checked);
                                                }, onClick: (e) => e.stopPropagation() }), _jsx("span", { style: {
                                                    fontWeight: isSelected ? "bold" : "normal",
                                                    flex: 1,
                                                }, children: inputLabels[key] })] }, key));
                                }) }), selectedInput && config.inputs[selectedInput] && (_jsxs("div", { style: {
                                    flex: 1,
                                    backgroundColor: "white",
                                    borderRadius: "4px",
                                    padding: "1.5rem",
                                    border: "1px solid #bdc3c7",
                                    overflowY: "auto",
                                    maxHeight: "600px",
                                }, children: [_jsx("h4", { style: { marginTop: 0, marginBottom: "1rem" }, children: inputLabels[selectedInput] }), _jsxs("div", { style: {
                                            marginBottom: "1.5rem",
                                            paddingBottom: "1rem",
                                            borderBottom: "1px solid #ecf0f1",
                                        }, children: [_jsx("h5", { style: { marginTop: 0, marginBottom: "0.75rem" }, children: "\u041E\u0431\u0449\u0438\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438" }), _jsxs("div", { style: { display: "grid", gap: "1rem" }, children: [_jsx("div", { children: _jsxs("label", { style: {
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "0.5rem",
                                                                marginBottom: "0.5rem",
                                                            }, children: [_jsx("input", { type: "checkbox", checked: config.inputs[selectedInput].enabled !== false, onChange: (e) => handleInputChange(`inputs.${selectedInput}.enabled`, e.target.checked) }), _jsx("span", { style: { fontWeight: "bold" }, children: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0438\u043D\u043F\u0443\u0442" })] }) }), _jsxs("div", { children: [_jsx("label", { style: {
                                                                    display: "block",
                                                                    marginBottom: "0.5rem",
                                                                    fontWeight: "bold",
                                                                }, children: "\u0418\u043C\u044F \u0438\u043B\u0438 \u043D\u043E\u043C\u0435\u0440 \u0438\u043D\u043F\u0443\u0442\u0430" }), _jsx("input", { type: "text", value: config.inputs[selectedInput].inputIdentifier ||
                                                                    config.inputs[selectedInput].name ||
                                                                    "", onChange: (e) => handleInputChange(`inputs.${selectedInput}.inputIdentifier`, e.target.value), style: {
                                                                    width: "100%",
                                                                    padding: "0.5rem",
                                                                    fontSize: "1rem",
                                                                    border: "1px solid #bdc3c7",
                                                                    borderRadius: "4px",
                                                                }, placeholder: "Input5 \u0438\u043B\u0438 \u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u0438\u043D\u043F\u0443\u0442\u0430" }), _jsx("small", { style: {
                                                                    color: "#7f8c8d",
                                                                    display: "block",
                                                                    marginTop: "0.25rem",
                                                                }, children: "\u0415\u0441\u043B\u0438 \u0447\u0438\u0441\u043B\u043E - \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0435 \u043F\u043E \u043D\u043E\u043C\u0435\u0440\u0443, \u0435\u0441\u043B\u0438 \u0441\u0442\u0440\u043E\u043A\u0430 - \u043F\u043E\u0438\u0441\u043A \u043F\u043E \u0438\u043C\u0435\u043D\u0438" })] }), _jsxs("div", { children: [_jsx("label", { style: {
                                                                    display: "block",
                                                                    marginBottom: "0.5rem",
                                                                    fontWeight: "bold",
                                                                }, children: "\u041D\u043E\u043C\u0435\u0440 \u043E\u0432\u0435\u0440\u043B\u0435\u044F" }), _jsx("select", { value: config.inputs[selectedInput].overlay || 1, onChange: (e) => handleInputChange(`inputs.${selectedInput}.overlay`, parseInt(e.target.value)), style: {
                                                                    width: "100%",
                                                                    padding: "0.5rem",
                                                                    fontSize: "1rem",
                                                                    border: "1px solid #bdc3c7",
                                                                    borderRadius: "4px",
                                                                }, children: [1, 2, 3, 4, 5, 6, 7, 8].map((num) => (_jsxs("option", { value: num, children: ["\u041E\u0432\u0435\u0440\u043B\u0435\u0439 ", num] }, num))) })] })] })] }), config.inputs[selectedInput].fields &&
                                        Object.keys(config.inputs[selectedInput].fields).length > 0 && (_jsxs("div", { children: [_jsx("h5", { style: { marginTop: 0, marginBottom: "0.75rem" }, children: "\u041F\u043E\u043B\u044F \u0438\u043D\u043F\u0443\u0442\u0430" }), _jsx("div", { style: { display: "grid", gap: "0.75rem" }, children: Object.entries(config.inputs[selectedInput].fields).map(([fieldKey, field]) => (_jsxs("div", { style: {
                                                        padding: "1rem",
                                                        backgroundColor: "#f8f9fa",
                                                        borderRadius: "4px",
                                                        border: "1px solid #e9ecef",
                                                        display: "grid",
                                                        gap: "0.75rem",
                                                    }, children: [_jsxs("div", { style: {
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: "0.75rem",
                                                            }, children: [_jsx("input", { type: "checkbox", checked: field.enabled !== false, onChange: (e) => handleInputChange(`inputs.${selectedInput}.fields.${fieldKey}.enabled`, e.target.checked) }), _jsx("span", { style: {
                                                                        flex: 1,
                                                                        fontWeight: "bold",
                                                                        opacity: field.enabled !== false ? 1 : 0.6,
                                                                    }, children: field.fieldName || fieldKey }), _jsx("span", { style: {
                                                                        fontSize: "0.75rem",
                                                                        padding: "0.25rem 0.5rem",
                                                                        borderRadius: "4px",
                                                                        backgroundColor: field.type === "text"
                                                                            ? "#e3f2fd"
                                                                            : field.type === "fill"
                                                                                ? "#fff3e0"
                                                                                : field.type === "image"
                                                                                    ? "#e8f5e9"
                                                                                    : "#e0e0e0",
                                                                        color: "#555",
                                                                    }, children: field.type === "text"
                                                                        ? "Текст"
                                                                        : field.type === "fill"
                                                                            ? "Филл"
                                                                            : field.type === "image"
                                                                                ? "Изображение"
                                                                                : field.type })] }), _jsxs("div", { children: [_jsx("label", { style: {
                                                                        display: "block",
                                                                        marginBottom: "0.25rem",
                                                                        fontSize: "0.875rem",
                                                                        fontWeight: "bold",
                                                                    }, children: "\u0418\u043C\u044F \u043F\u043E\u043B\u044F \u0434\u043B\u044F vMix (\u0431\u0430\u0437\u043E\u0432\u043E\u0435 \u0438\u043C\u044F)" }), _jsx("input", { type: "text", value: field.fieldIdentifier || "", onChange: (e) => {
                                                                        const path = `inputs.${selectedInput}.fields.${fieldKey}.fieldIdentifier`;
                                                                        const parts = path.split(".");
                                                                        if (parts.length === 5) {
                                                                            const [parent, inputKey, fieldsKey, fieldKey2, property,] = parts;
                                                                            setConfig((prev) => ({
                                                                                ...prev,
                                                                                [parent]: {
                                                                                    ...prev[parent],
                                                                                    [inputKey]: {
                                                                                        ...prev[parent][inputKey],
                                                                                        [fieldsKey]: {
                                                                                            ...prev[parent][inputKey][fieldsKey],
                                                                                            [fieldKey2]: {
                                                                                                ...prev[parent][inputKey][fieldsKey][fieldKey2],
                                                                                                [property]: e.target.value,
                                                                                            },
                                                                                        },
                                                                                    },
                                                                                },
                                                                            }));
                                                                        }
                                                                    }, style: {
                                                                        width: "100%",
                                                                        padding: "0.5rem",
                                                                        fontSize: "0.875rem",
                                                                        border: "1px solid #bdc3c7",
                                                                        borderRadius: "4px",
                                                                    }, placeholder: "\u0418\u043C\u044F \u043F\u043E\u043B\u044F \u0434\u043B\u044F vMix" }), field.fieldIdentifier && field.type && (_jsxs("small", { style: {
                                                                        color: "#3498db",
                                                                        display: "block",
                                                                        marginTop: "0.25rem",
                                                                        fontWeight: "bold",
                                                                    }, children: ["\u041F\u043E\u043B\u043D\u043E\u0435 \u0438\u043C\u044F: ", getFullFieldName(field.fieldIdentifier, field.type)] }))] })] }, fieldKey))) })] }))] }))] })] }), _jsxs("div", { style: {
                    display: "flex",
                    gap: "1rem",
                    justifyContent: "flex-end",
                }, children: [_jsx("button", { onClick: () => navigate("/match"), style: {
                            padding: "0.75rem 1.5rem",
                            fontSize: "1rem",
                            backgroundColor: "#95a5a6",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                        }, children: "\u041E\u0442\u043C\u0435\u043D\u0430" }), _jsx("button", { onClick: handleSave, style: {
                            padding: "0.75rem 1.5rem",
                            fontSize: "1rem",
                            backgroundColor: "#27ae60",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontWeight: "bold",
                        }, children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438" })] })] }));
}
export default VMixSettingsPage;
