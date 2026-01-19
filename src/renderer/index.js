import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
const isElectronProduction = window.location.protocol === 'file:';
const Router = isElectronProduction ? HashRouter : BrowserRouter;
if (isElectronProduction && !window.location.hash) {
    const currentPath = window.location.pathname;
    if (currentPath.includes('index.html') || currentPath.includes('dist')) {
        window.location.hash = '#/';
    }
}
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(_jsx(StrictMode, { children: _jsx(ErrorBoundary, { children: _jsx(Router, { future: { v7_startTransition: true, v7_relativeSplatPath: true }, children: _jsx(App, {}) }) }) }));
