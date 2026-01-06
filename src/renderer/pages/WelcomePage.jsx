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
    // Проверяем статус vMix каждые 5 секунд
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
      console.error('Ошибка при открытии матча:', error);
      alert('Не удалось открыть матч: ' + error.message);
    }
  };

  return (
    <div style={{
      maxWidth: '700px',
      margin: '0 auto',
      padding: '2rem',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: '#2c3e50' }}>
          vMix Volley Scoreboard
        </h1>
        <p style={{ fontSize: '1.2rem', color: '#7f8c8d' }}>
          Управление счетом волейбольных матчей
        </p>
      </div>

      <div style={{
        backgroundColor: '#ecf0f1',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '2rem',
      }}>
        <h3 style={{ marginTop: 0 }}>Статус подключения</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: vmixStatus.connected ? '#27ae60' : '#e74c3c',
          }}></div>
          <span>
            <strong>vMix:</strong> {vmixStatus.message}
          </span>
        </div>
        {!vmixStatus.connected && (
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#7f8c8d' }}>
            Настройте подключение к vMix в настройках приложения
          </p>
        )}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <button
          onClick={handleCreateMatch}
          style={{
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
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          ➕ Создать новый матч
        </button>
        <button
          onClick={handleOpenMatch}
          style={{
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
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          📂 Открыть существующий матч
        </button>
      </div>

      <div style={{
        backgroundColor: '#fff3cd',
        padding: '1rem',
        borderRadius: '8px',
        border: '1px solid #ffc107',
      }}>
        <h4 style={{ marginTop: 0 }}>Быстрый старт:</h4>
        <ol style={{ margin: 0, paddingLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>Создайте новый матч или откройте существующий</li>
          <li>Настройте параметры матча (команды, турнир, место)</li>
          <li>Настройте подключение к vMix (если используется)</li>
          <li>Начните ведение счета</li>
        </ol>
      </div>
    </div>
  );
}

export default WelcomePage;


