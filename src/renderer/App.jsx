import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { applyTheme } from './theme/applyTheme';
import { light, dark } from './theme/tokens';
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
  const [theme, setTheme] = useState('light'); // 'light' | 'dark' — эффективная тема для отображения
  const location = useLocation();
  const navigate = useNavigate();

  // Загружаем настройку темы и применяем
  useEffect(() => {
    let resolved = 'light';
    const loadTheme = async () => {
      if (!window.electronAPI?.getUISettings) return;
      try {
        const result = await window.electronAPI.getUISettings();
        if (result.success && result.theme) {
          if (result.theme === 'system') {
            resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          } else {
            resolved = result.theme;
          }
        }
      } catch (e) {
        console.error('Ошибка загрузки темы:', e);
      }
      setTheme(resolved);
    };
    loadTheme();
  }, []);

  // Слушаем смену темы извне (например, из меню)
  useEffect(() => {
    if (!window.electronAPI?.onUIThemeChanged) return;
    const remove = window.electronAPI.onUIThemeChanged((newTheme) => {
      const resolved = newTheme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : newTheme;
      setTheme(resolved);
    });
    return () => remove?.();
  }, []);

  // Применяем тему к DOM
  useEffect(() => {
    applyTheme(theme === 'dark' ? dark : light);
  }, [theme]);

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
          // Переходим с forceUpdateVMix для принудительного обновления vMix
          navigate('/match', { 
            state: { 
              match,
              forceUpdateVMix: true // Флаг для принудительного обновления всех данных в vMix
            } 
          });
        } else {
          navigate('/match', { 
            state: { 
              match,
              forceUpdateVMix: true // Флаг для принудительного обновления всех данных в vMix
            } 
          });
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
  }, [navigate, currentMatch, location.pathname]);

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

