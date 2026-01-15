import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";

// В Electron production используем HashRouter для работы с file:// протоколом
// В dev режиме используем BrowserRouter для чистых URL
// HashRouter использует хэш (#) в URL, что позволяет работать с file:// протоколом
const isElectronProduction = window.location.protocol === 'file:';
const Router = isElectronProduction ? HashRouter : BrowserRouter;

// Нормализуем начальный путь для HashRouter
// Если загружено напрямую без хэша, добавляем хэш для корневого маршрута
if (isElectronProduction && !window.location.hash) {
  // Если нет хэша и путь не является корневым, перенаправляем на корневой маршрут
  const currentPath = window.location.pathname;
  // Если путь содержит полный путь к файлу (например, /D:/.../index.html), используем корневой маршрут
  if (currentPath.includes('index.html') || currentPath.includes('dist')) {
    window.location.hash = '#/';
  }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <ErrorBoundary>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </Router>
    </ErrorBoundary>
  </StrictMode>
);
