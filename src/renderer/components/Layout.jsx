import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Layout({ children, match, onMatchChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Загружаем настройки автосохранения при монтировании
  useEffect(() => {
    const loadAutoSaveSettings = async () => {
      if (window.electronAPI && window.electronAPI.getAutoSaveSettings) {
        try {
          const result = await window.electronAPI.getAutoSaveSettings();
          if (result.success) {
            setAutoSaveEnabled(result.enabled);
          }
        } catch (error) {
          console.error('Ошибка при загрузке настроек автосохранения:', error);
        }
      }
    };
    loadAutoSaveSettings();
    
    // Слушаем изменения автосохранения из меню
    if (window.electronAPI && window.electronAPI.onAutoSaveSettingsChanged) {
      const removeListener = window.electronAPI.onAutoSaveSettingsChanged((enabled) => {
        setAutoSaveEnabled(enabled);
      });
      return () => removeListener?.();
    }
  }, []);

  // Обработчик изменения галочки автосохранения
  const handleAutoSaveToggle = async (enabled) => {
    if (window.electronAPI && window.electronAPI.setAutoSaveSettings) {
      try {
        const result = await window.electronAPI.setAutoSaveSettings(enabled);
        if (result.success) {
          setAutoSaveEnabled(enabled);
        } else {
          alert('Не удалось изменить настройки автосохранения: ' + (result.error || 'Неизвестная ошибка'));
        }
      } catch (error) {
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
        // Отмечаем как сохраненный
        if (window.electronAPI.markMatchSaved) {
          window.electronAPI.markMatchSaved();
        }
      }
    } catch (error) {
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
        // Отмечаем как сохраненный
        if (window.electronAPI.markMatchSaved) {
          window.electronAPI.markMatchSaved();
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении матча:', error);
      alert('Не удалось сохранить матч: ' + error.message);
    }
  };

  // На главной странице Header не показываем
  if (location.pathname === '/') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <main style={{ flex: 1, padding: '1rem', backgroundColor: '#f5f5f5' }}>
          {children}
        </main>
      </div>
    );
  }

  // На странице управления матчем показываем специальный Header
  if (location.pathname === '/match') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <header style={{
          backgroundColor: '#2c3e50',
          color: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            padding: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
            maxWidth: '1600px',
            margin: '0 auto',
            width: '100%',
          }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Управление матчем</h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                cursor: 'pointer',
                fontSize: '0.9rem',
                userSelect: 'none',
              }}>
                <input
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => handleAutoSaveToggle(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span>Автосохранение</span>
              </label>
              <button
                onClick={handleSaveMatch}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Сохранить
              </button>
              <button
                onClick={handleSaveAsMatch}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Сохранить как...
              </button>
            </div>
          </div>
        </header>
        <main style={{ flex: 1, padding: '1rem', backgroundColor: '#f5f5f5' }}>
          {children}
        </main>
      </div>
    );
  }

  // На остальных страницах показываем обычный Header
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <header style={{
        backgroundColor: '#2c3e50',
        color: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          padding: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', cursor: 'pointer' }} onClick={() => navigate('/')}>
            vMix Volley Scoreboard
          </h1>
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: isActive('/') ? '#3498db' : 'transparent',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Главная
            </button>
            <button
              onClick={() => navigate('/about')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: isActive('/about') ? '#3498db' : 'transparent',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              О программе
            </button>
          </nav>
        </div>
      </header>
      <main style={{ flex: 1, padding: '1rem', backgroundColor: '#f5f5f5' }}>
        {children}
      </main>
    </div>
  );
}

export default Layout;

