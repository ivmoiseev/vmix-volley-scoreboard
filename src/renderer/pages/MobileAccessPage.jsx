import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function MobileAccessPage() {
  const navigate = useNavigate();
  const [serverInfo, setServerInfo] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const sessionLoadedRef = useRef(false);

  useEffect(() => {
    loadServerInfo();
    // Обновляем информацию о сервере каждые 2 секунды
    const interval = setInterval(() => {
      loadServerInfo();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Загружаем сохраненную сессию при изменении состояния сервера
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
    } catch (error) {
      console.error('Ошибка при загрузке информации о сервере:', error);
    }
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
        // Загружаем сохраненную сессию, если она есть, иначе генерируем новую
        const savedSession = await window.electronAPI.getSavedMobileSession();
        if (savedSession && savedSession.url) {
          setSessionData(savedSession);
          await generateQRCode(savedSession.url);
        } else {
          // Генерируем новую сессию только если нет сохраненной
          await generateSession();
        }
      } else {
        alert('Не удалось запустить сервер: ' + result.error);
      }
    } catch (error) {
      alert('Ошибка: ' + error.message);
    } finally {
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
        sessionLoadedRef.current = false; // Сбрасываем флаг для следующего запуска
      } else {
        alert('Не удалось остановить сервер: ' + result.error);
      }
    } catch (error) {
      alert('Ошибка: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedSession = async () => {
    // Предотвращаем повторную загрузку
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
    } catch (error) {
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
        sessionLoadedRef.current = true; // Отмечаем, что сессия загружена
        setSessionData(result);
        await generateQRCode(result.url);
      } else {
        alert('Не удалось сгенерировать сессию. Убедитесь, что сервер запущен.');
      }
    } catch (error) {
      alert('Ошибка при генерации сессии: ' + error.message);
    }
  };

  const generateQRCode = async (url) => {
    try {
      // Используем библиотеку qrcode через IPC
      // Для простоты используем внешний сервис или создаем через canvas
      // В реальном приложении лучше использовать библиотеку напрямую
      
      // Используем API для генерации QR кода
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
      
      // Загружаем изображение и конвертируем в data URL
      const response = await fetch(qrApiUrl);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrCodeDataUrl(reader.result);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Ошибка при генерации QR-кода:', error);
      // Fallback: используем простой способ
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
    } catch (error) {
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = sessionData.url;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        alert('Ссылка скопирована в буфер обмена!');
      } catch (err) {
        alert('Не удалось скопировать ссылку');
      }
      document.body.removeChild(textArea);
    }
  };

  const isServerRunning = serverInfo && serverInfo.running !== false;

  return (
    <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Мобильный доступ</h2>

      {/* Статус сервера */}
      <div style={{
        backgroundColor: '#ecf0f1',
        padding: '1.5rem',
        borderRadius: '4px',
        marginBottom: '1.5rem',
      }}>
        <h3 style={{ marginTop: 0 }}>Статус сервера</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: isServerRunning ? '#27ae60' : '#e74c3c',
          }}></div>
          <span style={{ fontWeight: 'bold' }}>
            {isServerRunning ? 'Запущен' : 'Остановлен'}
          </span>
        </div>

        {isServerRunning && serverInfo && (
          <div style={{ marginTop: '1rem' }}>
            <p><strong>Адрес сервера:</strong> {serverInfo.url}</p>
            <p><strong>IP адрес:</strong> {serverInfo.ip}</p>
            <p><strong>Порт:</strong> {serverInfo.port}</p>
            {serverInfo.sessionsCount !== undefined && (
              <p><strong>Активных сессий:</strong> {serverInfo.sessionsCount}</p>
            )}
          </div>
        )}

        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
          {!isServerRunning ? (
            <button
              onClick={handleStartServer}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                backgroundColor: loading ? '#95a5a6' : '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {loading ? 'Запуск...' : 'Запустить сервер'}
            </button>
          ) : (
            <button
              onClick={handleStopServer}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                backgroundColor: loading ? '#95a5a6' : '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {loading ? 'Остановка...' : 'Остановить сервер'}
            </button>
          )}
        </div>
      </div>

      {/* Генерация ссылки и QR-кода */}
      {isServerRunning && (
        <div style={{
          backgroundColor: '#ecf0f1',
          padding: '1.5rem',
          borderRadius: '4px',
          marginBottom: '1.5rem',
        }}>
          <h3 style={{ marginTop: 0 }}>Уникальная ссылка для доступа</h3>
          
          {sessionData && sessionData.url ? (
            <>
              <div style={{
                backgroundColor: 'white',
                padding: '1rem',
                borderRadius: '4px',
                marginBottom: '1rem',
                border: '2px solid #3498db',
                wordBreak: 'break-all',
              }}>
                <div style={{ fontSize: '0.9rem', color: '#7f8c8d', marginBottom: '0.5rem' }}>
                  Ссылка для мобильного доступа:
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2c3e50' }}>
                  {sessionData.url}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={copyLinkToClipboard}
                  style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    backgroundColor: '#3498db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Копировать ссылку
                </button>
                <button
                  onClick={generateSession}
                  style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    backgroundColor: '#9b59b6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Сгенерировать новую ссылку
                </button>
              </div>

              {/* QR-код */}
              <div style={{
                textAlign: 'center',
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '4px',
              }}>
                <h4 style={{ marginTop: 0, marginBottom: '1rem' }}>
                  QR-код для быстрого подключения:
                </h4>
                {qrCodeDataUrl ? (
                  <div style={{
                    display: 'inline-block',
                    padding: '1rem',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: '2px solid #ecf0f1',
                  }}>
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code"
                      style={{
                        width: '300px',
                        height: '300px',
                        maxWidth: '100%',
                      }}
                    />
                  </div>
                ) : (
                  <div style={{
                    width: '300px',
                    height: '300px',
                    margin: '0 auto',
                    backgroundColor: '#ecf0f1',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#7f8c8d',
                  }}>
                    Загрузка QR-кода...
                  </div>
                )}
                <p style={{
                  marginTop: '1rem',
                  fontSize: '0.9rem',
                  color: '#7f8c8d',
                }}>
                  Отсканируйте QR-код камерой мобильного устройства для быстрого доступа
                </p>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ marginBottom: '1rem', color: '#7f8c8d' }}>
                Нажмите кнопку для генерации уникальной ссылки доступа
              </p>
              <button
                onClick={generateSession}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Сгенерировать ссылку
              </button>
            </div>
          )}
        </div>
      )}

      {/* Инструкции */}
      <div style={{
        backgroundColor: '#fff3cd',
        padding: '1rem',
        borderRadius: '4px',
        border: '1px solid #ffc107',
      }}>
        <h4 style={{ marginTop: 0 }}>Инструкция:</h4>
        <ol style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>Запустите сервер, нажав кнопку "Запустить сервер"</li>
          <li>Сгенерируйте уникальную ссылку для доступа</li>
          <li>Скопируйте ссылку или отсканируйте QR-код с мобильного устройства</li>
          <li>Откройте ссылку в браузере мобильного устройства</li>
          <li>Убедитесь, что мобильное устройство подключено к той же Wi-Fi сети</li>
        </ol>
      </div>

      {/* Кнопка возврата */}
      <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        <button
          onClick={() => navigate('/match')}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Вернуться к матчу
        </button>
      </div>
    </div>
  );
}

export default MobileAccessPage;

