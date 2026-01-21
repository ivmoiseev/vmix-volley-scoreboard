import { useState, useEffect } from 'react';

function AboutPage() {
  const [version, setVersion] = useState('');
  const [updateStatus, setUpdateStatus] = useState(null);
  const [updateData, setUpdateData] = useState(null);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);

  useEffect(() => {
    loadVersion();
    loadAutoUpdateSettings();
    const cleanup = setupUpdateListeners();
    
    return () => {
      // Очистка слушателей при размонтировании
      if (cleanup) {
        cleanup();
      }
    };
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

  const loadAutoUpdateSettings = async () => {
    try {
      if (window.electronAPI && window.electronAPI.getAutoUpdateSettings) {
        const result = await window.electronAPI.getAutoUpdateSettings();
        if (result.success) {
          setAutoUpdateEnabled(result.enabled);
        }
      }
    } catch (error) {
      console.error('Ошибка при загрузке настроек автообновлений:', error);
    }
  };

  const handleToggleAutoUpdate = async (enabled) => {
    try {
      if (window.electronAPI && window.electronAPI.setAutoUpdateSettings) {
        const result = await window.electronAPI.setAutoUpdateSettings(enabled);
        if (result.success) {
          setAutoUpdateEnabled(enabled);
        } else {
          console.error('Ошибка при сохранении настроек автообновлений:', result.error);
        }
      }
    } catch (error) {
      console.error('Ошибка при изменении настроек автообновлений:', error);
    }
  };

  const setupUpdateListeners = () => {
    if (!window.electronAPI || !window.electronAPI.onUpdateStatus) {
      return;
    }

    const cleanup = window.electronAPI.onUpdateStatus((statusData) => {
      setUpdateStatus(statusData.status);
      setUpdateData(statusData.data);
    });

    // Возвращаем функцию очистки для useEffect
    return cleanup;
  };

  const handleCheckForUpdates = async () => {
    try {
      if (window.electronAPI && window.electronAPI.checkForUpdates) {
        setUpdateStatus('checking');
        await window.electronAPI.checkForUpdates();
      }
    } catch (error) {
      console.error('Ошибка при проверке обновлений:', error);
      setUpdateStatus('error');
      setUpdateData({ message: error.message });
    }
  };

  const handleDownloadUpdate = async () => {
    try {
      if (window.electronAPI && window.electronAPI.downloadUpdate) {
        await window.electronAPI.downloadUpdate();
      }
    } catch (error) {
      console.error('Ошибка при загрузке обновления:', error);
    }
  };

  const handleInstallUpdate = async () => {
    try {
      if (window.electronAPI && window.electronAPI.installUpdate) {
        await window.electronAPI.installUpdate();
      }
    } catch (error) {
      console.error('Ошибка при установке обновления:', error);
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

        {/* Компонент управления обновлениями */}
        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          backgroundColor: '#fff', 
          borderRadius: '4px',
          border: '1px solid #ddd'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ marginTop: 0, marginBottom: 0 }}>Обновления</h4>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={autoUpdateEnabled}
                onChange={(e) => handleToggleAutoUpdate(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.9rem' }}>Автоматическая проверка при запуске</span>
            </label>
          </div>
          
          {!autoUpdateEnabled && updateStatus !== 'checking' && updateStatus !== 'downloading' && updateStatus !== 'downloaded' && (
            <p style={{ color: '#7f8c8d', fontSize: '0.9rem', fontStyle: 'italic' }}>
              Автоматические обновления отключены. Вы можете проверить обновления вручную.
            </p>
          )}
          
          {updateStatus === 'disabled' && (
            <p style={{ color: '#7f8c8d' }}>
              Автоматические обновления отключены
            </p>
          )}
          
          {updateStatus === 'checking' && (
            <p style={{ color: '#3498db' }}>Проверка обновлений...</p>
          )}
          
          {updateStatus === 'available' && updateData && (
            <div>
              <p style={{ color: '#27ae60', fontWeight: 'bold' }}>
                Доступна новая версия: {updateData.version}
              </p>
              {updateData.releaseNotes && (
                <div style={{ 
                  marginTop: '0.5rem', 
                  padding: '0.5rem', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '4px',
                  fontSize: '0.9rem'
                }}>
                  <strong>Что нового:</strong>
                  <div style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>
                    {updateData.releaseNotes}
                  </div>
                </div>
              )}
              <button
                onClick={handleDownloadUpdate}
                style={{
                  marginTop: '1rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Скачать обновление
              </button>
            </div>
          )}
          
          {updateStatus === 'downloading' && updateData && (
            <div>
              <p style={{ color: '#3498db' }}>Загрузка обновления...</p>
              <div style={{
                marginTop: '0.5rem',
                width: '100%',
                height: '20px',
                backgroundColor: '#ecf0f1',
                borderRadius: '10px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${updateData.percent || 0}%`,
                  height: '100%',
                  backgroundColor: '#3498db',
                  transition: 'width 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}>
                  {updateData.percent || 0}%
                </div>
              </div>
              {updateData.transferred && updateData.total && (
                <p style={{ fontSize: '0.8rem', color: '#7f8c8d', marginTop: '0.5rem' }}>
                  {Math.round(updateData.transferred / 1024 / 1024)} МБ / {Math.round(updateData.total / 1024 / 1024)} МБ
                </p>
              )}
            </div>
          )}
          
          {updateStatus === 'downloaded' && updateData && (
            <div>
              <p style={{ color: '#27ae60', fontWeight: 'bold' }}>
                Обновление {updateData.version} загружено и готово к установке
              </p>
              <button
                onClick={handleInstallUpdate}
                style={{
                  marginTop: '1rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Установить сейчас
              </button>
              <p style={{ fontSize: '0.8rem', color: '#7f8c8d', marginTop: '0.5rem' }}>
                Приложение будет перезапущено для установки обновления
              </p>
            </div>
          )}
          
          {updateStatus === 'not-available' && (
            <p style={{ color: '#7f8c8d' }}>
              У вас установлена последняя версия приложения
            </p>
          )}
          
          {updateStatus === 'error' && updateData && (
            <p style={{ color: '#e74c3c' }}>
              Ошибка: {updateData.message || 'Не удалось проверить обновления'}
            </p>
          )}
          
          {(!updateStatus || updateStatus === 'not-available' || updateStatus === 'error' || updateStatus === 'disabled') && (
            <button
              onClick={handleCheckForUpdates}
              style={{
                marginTop: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Проверить обновления
            </button>
          )}
        </div>
        
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

        <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#fff', borderRadius: '4px' }}>
          <h4>Автор:</h4>
          <p style={{ lineHeight: '1.8' }}>
            <strong>Илья Моисеев</strong><br />
            Волгоград, Россия<br />
            <a href="mailto:ilyamoiseev@inbox.ru" style={{ color: '#3498db' }}>ilyamoiseev@inbox.ru</a><br />
            <a href="https://webcastmaster.ru" target="_blank" rel="noopener noreferrer" style={{ color: '#3498db' }}>webcastmaster.ru</a>
          </p>
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center', color: '#7f8c8d' }}>
          <p>© {new Date().getFullYear()} vMix Volley Scoreboard</p>
        </div>
      </div>
    </div>
  );
}

export default AboutPage;

