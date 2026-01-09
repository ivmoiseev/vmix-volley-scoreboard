import React, { useState, useEffect } from 'react';
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

  // Получаем матч из state при навигации
  useEffect(() => {
    if (location.state?.match) {
      const matchFromState = location.state.match;
      setCurrentMatch(matchFromState);
      
      // Обновляем матч в Electron API
      if (window.electronAPI) {
        window.electronAPI.setCurrentMatch(matchFromState).catch(err => {
          console.error('Ошибка при обновлении матча:', err);
        });
        window.electronAPI.setMobileMatch(matchFromState).catch(err => {
          console.error('Ошибка при обновлении мобильного матча:', err);
        });
      }
      
      // Очищаем state после использования
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Обработка команд из меню
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleNavigate = (path) => {
      navigate(path);
    };

    const handleLoadMatch = (match) => {
      if (match) {
        setCurrentMatch(match);
        // Если мы уже на странице /match, просто обновляем состояние
        // Если нет - переходим на страницу
        if (location.pathname === '/match') {
          // Уже на странице матча, состояние обновится через проп
        } else {
          navigate('/match', { state: { match } });
        }
      }
    };

    const handleRefreshVMix = () => {
      // Обновление vMix будет обработано в MatchControlPage
      if (currentMatch) {
        // Переходим на страницу матча с флагом для принудительного обновления всех данных
        navigate('/match', { 
          state: { 
            match: currentMatch,
            forceUpdateVMix: true // Флаг для принудительного обновления всех данных в vMix
          } 
        });
      }
    };

    // Сохраняем функции для удаления слушателей
    const removeNavigate = window.electronAPI.onNavigate?.(handleNavigate);
    const removeLoadMatch = window.electronAPI.onLoadMatch?.(handleLoadMatch);
    const removeRefreshVMix = window.electronAPI.onRefreshVMix?.(handleRefreshVMix);

    return () => {
      // Удаляем слушатели при размонтировании компонента
      removeNavigate?.();
      removeLoadMatch?.();
      removeRefreshVMix?.();
    };
  }, [navigate, currentMatch]);

  return (
    <Layout match={currentMatch} onMatchChange={setCurrentMatch}>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route 
          path="/match" 
          element={
            <MatchControlPage 
              match={currentMatch} 
              onMatchChange={setCurrentMatch}
            />
          } 
        />
        <Route 
          path="/match/settings" 
          element={
            <MatchSettingsPage 
              match={currentMatch}
              onMatchChange={setCurrentMatch}
            />
          } 
        />
        <Route 
          path="/match/roster" 
          element={
            <RosterManagementPage 
              match={currentMatch}
              onMatchChange={setCurrentMatch}
            />
          } 
        />
        <Route 
          path="/vmix/settings" 
          element={<VMixSettingsPage />} 
        />
        <Route 
          path="/mobile/access" 
          element={<MobileAccessPage />} 
        />
        <Route 
          path="/about" 
          element={<AboutPage />} 
        />
      </Routes>
    </Layout>
  );
}

export default App;

