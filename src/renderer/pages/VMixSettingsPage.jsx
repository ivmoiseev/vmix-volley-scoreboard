import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function VMixSettingsPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState({
    host: 'localhost',
    port: 8088,
    inputs: {
      lineup: { name: 'Input1', overlay: 1 },
      statistics: { name: 'Input2', overlay: 1 },
      roster: { name: 'Input3', overlay: 1 },
      startingLineup: { name: 'Input4', overlay: 1 },
      currentScore: { name: 'Input5', overlay: 1 },
      set1Score: { name: 'Input6', overlay: 1 },
      set2Score: { name: 'Input7', overlay: 1 },
      set3Score: { name: 'Input8', overlay: 1 },
      set4Score: { name: 'Input9', overlay: 1 },
      set5Score: { name: 'Input10', overlay: 1 },
      referee1: { name: 'Input11', overlay: 1 },
      referee2: { name: 'Input12', overlay: 1 },
    },
  });
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    testing: false,
    message: '',
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      if (!window.electronAPI) {
        return;
      }
      const savedConfig = await window.electronAPI.getVMixConfig();
      if (savedConfig) {
        // Конвертируем старый формат в новый, если нужно
        const convertedConfig = {
          ...savedConfig,
          inputs: Object.keys(savedConfig.inputs || {}).reduce((acc, key) => {
            const value = savedConfig.inputs[key];
            if (typeof value === 'string') {
              // Старый формат: конвертируем в новый
              acc[key] = {
                name: value,
                overlay: savedConfig.overlay || 1,
              };
            } else {
              // Новый формат: используем как есть
              acc[key] = value;
            }
            return acc;
          }, {}),
        };
        // Удаляем старое поле overlay, если оно есть
        delete convertedConfig.overlay;
        setConfig(convertedConfig);
      }
    } catch (error) {
      console.error('Ошибка при загрузке настроек vMix:', error);
    }
  };

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const parts = field.split('.');
      if (parts.length === 3) {
        // inputs.key.name или inputs.key.overlay
        const [parent, key, property] = parts;
        setConfig(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [key]: {
              ...prev[parent][key],
              [property]: property === 'overlay' ? parseInt(value) || 1 : value,
            },
          },
        }));
      } else {
        // Старый формат для обратной совместимости
        const [parent, child] = parts;
        setConfig(prev => ({
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value,
          },
        }));
      }
    } else {
      setConfig(prev => ({
        ...prev,
        [field]: field === 'port' ? (parseInt(value) || 8088) : value,
      }));
    }
  };

  const handleTestConnection = async () => {
    setConnectionStatus({ connected: false, testing: true, message: 'Проверка подключения...' });
    
    try {
      if (!window.electronAPI) {
        setConnectionStatus({
          connected: false,
          testing: false,
          message: 'Electron API недоступен',
        });
        return;
      }

      const result = await window.electronAPI.testVMixConnection(config.host, config.port);
      
      if (result.success) {
        setConnectionStatus({
          connected: true,
          testing: false,
          message: 'Подключение успешно!',
        });
      } else {
        setConnectionStatus({
          connected: false,
          testing: false,
          message: result.error || 'Не удалось подключиться к vMix',
        });
      }
    } catch (error) {
      setConnectionStatus({
        connected: false,
        testing: false,
        message: 'Ошибка: ' + error.message,
      });
    }
  };

  const handleSave = async () => {
    try {
      if (!window.electronAPI) {
        alert('Electron API недоступен');
        return;
      }

      // Конвертируем старый формат в новый, если нужно
      const configToSave = {
        ...config,
        inputs: Object.keys(config.inputs).reduce((acc, key) => {
          const value = config.inputs[key];
          if (typeof value === 'string') {
            // Старый формат: конвертируем в новый
            acc[key] = {
              name: value,
              overlay: config.overlay || 1,
            };
          } else {
            // Новый формат: используем как есть
            acc[key] = value;
          }
          return acc;
        }, {}),
      };
      
      // Удаляем старое поле overlay, если оно есть
      delete configToSave.overlay;

      await window.electronAPI.setVMixConfig(configToSave);
      alert('Настройки сохранены!');
      navigate('/match');
    } catch (error) {
      console.error('Ошибка при сохранении настроек:', error);
      alert('Не удалось сохранить настройки: ' + error.message);
    }
  };

  const inputLabels = {
    lineup: 'Заявка (TeamA vs TeamB)',
    statistics: 'Статистика',
    roster: 'Состав команды (полный)',
    startingLineup: 'Стартовый состав команды',
    currentScore: 'Текущий счет (во время партии)',
    set1Score: 'Счет после 1 партии',
    set2Score: 'Счет после 2 партии',
    set3Score: 'Счет после 3 партии',
    set4Score: 'Счет после 4 партии',
    set5Score: 'Счет после 5 партии',
    referee1: 'Плашка 1 судья',
    referee2: 'Плашка 2 судьи',
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h2>Настройки подключения к vMix</h2>

      {/* Настройки подключения */}
      <div style={{
        backgroundColor: '#ecf0f1',
        padding: '1.5rem',
        borderRadius: '4px',
        marginBottom: '1.5rem',
      }}>
        <h3 style={{ marginTop: 0 }}>Подключение</h3>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              IP адрес vMix
            </label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => handleInputChange('host', e.target.value)}
              style={{
                width: '100%',
                maxWidth: '300px',
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #bdc3c7',
                borderRadius: '4px',
              }}
              placeholder="192.168.1.100"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Порт
            </label>
            <input
              type="number"
              value={config.port}
              onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 8088)}
              style={{
                width: '100%',
                maxWidth: '150px',
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #bdc3c7',
                borderRadius: '4px',
              }}
              placeholder="8088"
            />
          </div>
          <div>
            <button
              onClick={handleTestConnection}
              disabled={connectionStatus.testing}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                backgroundColor: connectionStatus.testing ? '#95a5a6' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: connectionStatus.testing ? 'not-allowed' : 'pointer',
              }}
            >
              {connectionStatus.testing ? 'Проверка...' : 'Тест подключения'}
            </button>
            {connectionStatus.message && (
              <span style={{
                marginLeft: '1rem',
                color: connectionStatus.connected ? '#27ae60' : '#e74c3c',
                fontWeight: 'bold',
              }}>
                {connectionStatus.message}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Настройка инпутов */}
      <div style={{
        backgroundColor: '#ecf0f1',
        padding: '1.5rem',
        borderRadius: '4px',
        marginBottom: '1.5rem',
      }}>
        <h3 style={{ marginTop: 0 }}>Настройка инпутов</h3>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {Object.keys(inputLabels).map((key) => {
            // Поддержка старого формата для обратной совместимости
            const inputValue = typeof config.inputs[key] === 'string' 
              ? config.inputs[key] 
              : (config.inputs[key]?.name || '');
            const overlayValue = typeof config.inputs[key] === 'object' && config.inputs[key]?.overlay
              ? config.inputs[key].overlay
              : (config.overlay || 1);
            
            return (
              <div key={key} style={{ 
                display: 'grid', 
                gridTemplateColumns: '250px 1fr 150px', 
                gap: '1rem', 
                alignItems: 'center' 
              }}>
                <label style={{ fontWeight: 'bold' }}>
                  {inputLabels[key]}:
                </label>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    // Если старый формат, конвертируем в новый
                    if (typeof config.inputs[key] === 'string') {
                      setConfig(prev => ({
                        ...prev,
                        inputs: {
                          ...prev.inputs,
                          [key]: {
                            name: e.target.value,
                            overlay: overlayValue,
                          },
                        },
                      }));
                    } else {
                      handleInputChange(`inputs.${key}.name`, e.target.value);
                    }
                  }}
                  style={{
                    padding: '0.5rem',
                    fontSize: '1rem',
                    border: '1px solid #bdc3c7',
                    borderRadius: '4px',
                  }}
                  placeholder={`Input${key === 'lineup' ? '1' : ''}`}
                />
                <select
                  value={overlayValue}
                  onChange={(e) => {
                    const overlay = parseInt(e.target.value) || 1;
                    // Если старый формат, конвертируем в новый
                    if (typeof config.inputs[key] === 'string') {
                      setConfig(prev => ({
                        ...prev,
                        inputs: {
                          ...prev.inputs,
                          [key]: {
                            name: inputValue,
                            overlay: overlay,
                          },
                        },
                      }));
                    } else {
                      handleInputChange(`inputs.${key}.overlay`, overlay);
                    }
                  }}
                  style={{
                    padding: '0.5rem',
                    fontSize: '1rem',
                    border: '1px solid #bdc3c7',
                    borderRadius: '4px',
                  }}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <option key={num} value={num}>Оверлей {num}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* Кнопки */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        justifyContent: 'flex-end',
      }}>
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
          Отмена
        </button>
        <button
          onClick={handleSave}
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
          Сохранить настройки
        </button>
      </div>
    </div>
  );
}

export default VMixSettingsPage;

