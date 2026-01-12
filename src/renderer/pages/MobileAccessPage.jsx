import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHeaderButtons } from '../components/Layout';

function MobileAccessPage() {
  const navigate = useNavigate();
  const { setButtons } = useHeaderButtons();
  const [serverInfo, setServerInfo] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [networkInterfaces, setNetworkInterfaces] = useState([]);
  const [selectedIP, setSelectedIP] = useState(null);
  const [savingIP, setSavingIP] = useState(false);
  const sessionLoadedRef = useRef(false);

  useEffect(() => {
    loadServerInfo();
    loadNetworkInterfaces();
    // Обновляем информацию о сервере каждые 2 секунды
    const interval = setInterval(() => {
      loadServerInfo();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Загружаем выбранный IP из настроек при изменении serverInfo
  useEffect(() => {
    if (serverInfo && serverInfo.selectedIP !== undefined) {
      setSelectedIP(serverInfo.selectedIP);
    } else if (serverInfo && serverInfo.ip) {
      // Если нет сохраненного выбранного IP, используем текущий IP
      setSelectedIP(serverInfo.ip);
    }
  }, [serverInfo]);

  // Проверяем, что выбранный IP есть в списке интерфейсов при загрузке списка
  useEffect(() => {
    const isServerRunning = serverInfo && serverInfo.running !== false;
    
    if (networkInterfaces.length > 0 && selectedIP) {
      const found = networkInterfaces.find(iface => iface.ip === selectedIP);
      if (!found) {
        // Если выбранный IP не найден в списке, показываем предупреждение
        // и выбираем первый доступный в выпадающем списке (без автоматического сохранения)
        console.warn('Выбранный IP не найден в списке интерфейсов');
        const firstInterface = networkInterfaces.find(iface => !iface.isVpn) || networkInterfaces[0];
        if (firstInterface && !isServerRunning) {
          // Только если сервер не запущен, обновляем выбор в UI
          setSelectedIP(firstInterface.ip);
        }
      }
    } else if (networkInterfaces.length > 0 && !selectedIP && !isServerRunning) {
      // Если нет выбранного IP и сервер не запущен, выбираем первый доступный (не VPN)
      const firstInterface = networkInterfaces.find(iface => !iface.isVpn) || networkInterfaces[0];
      if (firstInterface) {
        setSelectedIP(firstInterface.ip);
      }
    }
  }, [networkInterfaces, selectedIP, serverInfo]);

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
      // Если есть выбранный IP в настройках, обновляем состояние
      if (info && info.selectedIP !== undefined) {
        setSelectedIP(info.selectedIP);
      }
    } catch (error) {
      console.error('Ошибка при загрузке информации о сервере:', error);
    }
  };

  const loadNetworkInterfaces = async () => {
    try {
      if (!window.electronAPI) {
        return;
      }
      const result = await window.electronAPI.getNetworkInterfaces();
      if (result.success && result.interfaces) {
        setNetworkInterfaces(result.interfaces);
      }
    } catch (error) {
      console.error('Ошибка при загрузке сетевых интерфейсов:', error);
    }
  };

  const handleSelectIP = async (ip) => {
    setSelectedIP(ip);
    setSavingIP(true);
    try {
      if (!window.electronAPI) {
        alert('Electron API недоступен');
        return;
      }
      const result = await window.electronAPI.setSelectedIP(ip);
      if (result.success) {
        console.log('Выбранный IP сохранен:', ip);
        // Обновляем информацию о сервере, чтобы показать новый IP
        await loadServerInfo();
      } else {
        alert('Не удалось сохранить выбранный IP: ' + (result.error || 'Неизвестная ошибка'));
        // Возвращаем предыдущее значение при ошибке
        if (serverInfo && serverInfo.selectedIP) {
          setSelectedIP(serverInfo.selectedIP);
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении выбранного IP:', error);
      alert('Ошибка при сохранении выбранного IP: ' + error.message);
      // Возвращаем предыдущее значение при ошибке
      if (serverInfo && serverInfo.selectedIP) {
        setSelectedIP(serverInfo.selectedIP);
      }
    } finally {
      setSavingIP(false);
    }
  };

  const handleSave = async () => {
    // Сохранение уже происходит автоматически при выборе IP через handleSelectIP
    // Но можно добавить явное сохранение, если нужно
    if (selectedIP) {
      await handleSelectIP(selectedIP);
      alert('Настройки сохранены!');
    }
  };

  const handleCancel = () => {
    navigate('/match');
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

  // Устанавливаем кнопки в шапку
  useEffect(() => {
    const handleSaveClick = async () => {
      // Сохранение уже происходит автоматически при выборе IP через handleSelectIP
      // Но можно добавить явное сохранение, если нужно
      if (selectedIP) {
        await handleSelectIP(selectedIP);
        alert('Настройки сохранены!');
      }
    };

    const handleCancelClick = () => {
      navigate('/match');
    };

    setButtons(
      <>
        <button
          onClick={handleCancelClick}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Отменить
        </button>
        <button
          onClick={handleSaveClick}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          Сохранить
        </button>
      </>
    );
    return () => setButtons(null);
  }, [selectedIP, setButtons, navigate]);

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

        {/* Выбор сетевого интерфейса */}
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: 'bold',
          }}>
            Сетевой интерфейс:
          </label>
          <select
            value={selectedIP || ''}
            onChange={(e) => handleSelectIP(e.target.value)}
            disabled={savingIP || isServerRunning}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #bdc3c7',
              borderRadius: '4px',
              backgroundColor: savingIP || isServerRunning ? '#ecf0f1' : 'white',
              cursor: savingIP || isServerRunning ? 'not-allowed' : 'pointer',
            }}
          >
            {networkInterfaces.length > 0 ? (
              networkInterfaces.map((iface, index) => (
                <option key={index} value={iface.ip}>
                  {iface.name} {iface.isVpn ? '(VPN)' : ''} {iface.isPrivate ? '' : '(публичный)'}
                </option>
              ))
            ) : (
              <option value="">Загрузка интерфейсов...</option>
            )}
          </select>
          <div style={{
            marginTop: '0.5rem',
            fontSize: '0.85rem',
            color: '#7f8c8d',
          }}>
            {savingIP ? 'Сохранение...' : isServerRunning ? 'Остановите сервер для изменения интерфейса' : 'Выберите сетевой интерфейс для мобильного сервера'}
          </div>
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
          <li><strong>Выберите сетевой интерфейс</strong> в выпадающем списке выше (интерфейс должен быть в той же подсети, что и vMix)</li>
          <li>Запустите сервер, нажав кнопку "Запустить сервер"</li>
          <li>Сгенерируйте уникальную ссылку для доступа</li>
          <li>Скопируйте ссылку или отсканируйте QR-код с мобильного устройства</li>
          <li>Откройте ссылку в браузере мобильного устройства</li>
          <li>Убедитесь, что мобильное устройство подключено к той же сети, что и выбранный интерфейс</li>
        </ol>
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '0.9rem',
        }}>
          <strong>Важно:</strong> Если вы изменили сетевой интерфейс, необходимо остановить и заново запустить сервер для применения изменений.
        </div>
      </div>

      {/* Кнопки */}
      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
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
          Отменить
        </button>
        <button
          onClick={async () => {
            if (selectedIP) {
              await handleSelectIP(selectedIP);
              alert('Настройки сохранены!');
            }
          }}
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
          Сохранить
        </button>
      </div>
    </div>
  );
}

export default MobileAccessPage;

