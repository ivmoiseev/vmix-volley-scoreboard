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
    } catch (error) {
      console.error('Ошибка при загрузке версии:', error);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2>О программе</h2>
      
      <div style={{
        backgroundColor: '#ecf0f1',
        padding: '2rem',
        borderRadius: '8px',
        marginTop: '2rem',
      }}>
        <h3 style={{ marginTop: 0 }}>vMix Volley Scoreboard</h3>
        <p style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
          Приложение для управления счетом в волейбольных турнирах с интеграцией vMix
        </p>
        
        {version && (
          <p><strong>Версия:</strong> {version}</p>
        )}
        
        <div style={{ marginTop: '2rem' }}>
          <h4>Основные возможности:</h4>
          <ul style={{ lineHeight: '1.8' }}>
            <li>Ведение счета матча с автоматическим учетом подачи</li>
            <li>Определение сетбола и матчбола по правилам ВФВ</li>
            <li>Расширенная статистика (опционально)</li>
            <li>Управление составами команд с логотипами</li>
            <li>Интеграция с vMix для отображения плашек</li>
            <li>Мобильный доступ через Wi-Fi</li>
            <li>Сохранение матчей в JSON формате</li>
          </ul>
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h4>Техническая информация:</h4>
          <ul style={{ lineHeight: '1.8' }}>
            <li><strong>Платформа:</strong> Electron</li>
            <li><strong>Интерфейс:</strong> React</li>
            <li><strong>Сервер:</strong> Express</li>
            <li><strong>Формат данных:</strong> JSON</li>
          </ul>
        </div>

        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fff', borderRadius: '4px' }}>
          <h4>Лицензия:</h4>
          <p>См. файл LICENSE в корне проекта</p>
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center', color: '#7f8c8d' }}>
          <p>© 2024 vMix Volley Scoreboard</p>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;

