import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { resizeImage } from '../utils/imageResize';
import { useVMix } from '../hooks/useVMix';

function MatchSettingsPage({ match: propMatch, onMatchChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const matchFromState = location.state?.match;

  // Используем match из пропсов, затем из state, затем пытаемся загрузить из Electron API
  const [match, setMatch] = useState(propMatch || matchFromState || null);
  
  // Получаем updateMatchData и resetImageFieldsCache из useVMix для принудительного обновления при сохранении
  const { updateMatchData, connectionStatus, resetImageFieldsCache } = useVMix(match);
  
  const [formData, setFormData] = useState({
    tournament: '',
    tournamentSubtitle: '',
    location: '',
    venue: '',
    date: '',
    time: '',
    teamAName: '',
    teamAColor: '#3498db',
    teamACity: '',
    teamBName: '',
    teamBColor: '#e74c3c',
    teamBCity: '',
    referee1: '',
    referee2: '',
    lineJudge1: '',
    lineJudge2: '',
    scorer: '',
  });

  // Загружаем матч из Electron API, если его нет
  useEffect(() => {
    const loadMatch = async () => {
      if (!match && window.electronAPI) {
        try {
          // Пытаемся получить текущий матч из main процесса
          // Это может быть через какой-то API, но пока используем location.state
          // Если location.state есть, используем его
          if (matchFromState) {
            setMatch(matchFromState);
            return;
          }
        } catch (error) {
          console.error('Ошибка при загрузке матча:', error);
        }
      }
    };
    
    loadMatch();
  }, []);

  // Обновляем match при изменении propMatch или matchFromState
  useEffect(() => {
    if (propMatch) {
      setMatch(propMatch);
    } else if (matchFromState) {
      setMatch(matchFromState);
    }
  }, [propMatch, matchFromState]);

  useEffect(() => {
    if (!match) {
      // Не делаем редирект сразу, даем время загрузить матч
      const timer = setTimeout(() => {
        if (!match) {
          navigate('/');
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    // Заполняем форму данными из матча
    setFormData({
      tournament: match.tournament || '',
      tournamentSubtitle: match.tournamentSubtitle || '',
      location: match.location || '',
      venue: match.venue || '',
      date: match.date || '',
      time: match.time || '',
      teamAName: match.teamA.name || '',
      teamAColor: match.teamA.color || '#3498db',
      teamACity: match.teamA.city || '',
      teamBName: match.teamB.name || '',
      teamBColor: match.teamB.color || '#e74c3c',
      teamBCity: match.teamB.city || '',
      referee1: match.officials?.referee1 || '',
      referee2: match.officials?.referee2 || '',
      lineJudge1: match.officials?.lineJudge1 || '',
      lineJudge2: match.officials?.lineJudge2 || '',
      scorer: match.officials?.scorer || '',
    });
  }, [match, navigate]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!match) return;

    const updatedMatch = {
      ...match,
      tournament: formData.tournament,
      tournamentSubtitle: formData.tournamentSubtitle,
      location: formData.location,
      venue: formData.venue,
      date: formData.date,
      time: formData.time,
      teamA: {
        ...match.teamA,
        name: formData.teamAName,
        color: formData.teamAColor,
        city: formData.teamACity,
        // Сохраняем логотип, если он был загружен
        logo: match.teamA.logo,
      },
      teamB: {
        ...match.teamB,
        name: formData.teamBName,
        color: formData.teamBColor,
        city: formData.teamBCity,
        // Сохраняем логотип, если он был загружен
        logo: match.teamB.logo,
      },
      officials: {
        referee1: formData.referee1,
        referee2: formData.referee2,
        lineJudge1: formData.lineJudge1,
        lineJudge2: formData.lineJudge2,
        scorer: formData.scorer,
      },
      updatedAt: new Date().toISOString(),
    };

    // Обновляем матч в Electron API
    if (window.electronAPI) {
      try {
        await window.electronAPI.setCurrentMatch(updatedMatch);
        await window.electronAPI.setMobileMatch(updatedMatch);
      } catch (error) {
        console.error('Ошибка при сохранении матча:', error);
      }
    }

    // Обновляем матч в родительском компоненте (App.jsx)
    if (onMatchChange) {
      onMatchChange(updatedMatch);
    }

    setMatch(updatedMatch);
    
    // Принудительно обновляем все данные в vMix при сохранении настроек
    if (connectionStatus.connected) {
      updateMatchData(updatedMatch, true);
    }
    
    navigate('/match', { state: { match: updatedMatch } });
  };

  const handleCancel = () => {
    navigate('/match', { state: { match } });
  };

  if (!match) {
    return null;
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h2>Настройки матча</h2>

      {/* Информация о турнире */}
      <div style={{
        backgroundColor: '#ecf0f1',
        padding: '1.5rem',
        borderRadius: '4px',
        marginBottom: '1.5rem',
      }}>
        <h3 style={{ marginTop: 0 }}>Информация о турнире</h3>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Заголовок (название турнира)
            </label>
            <input
              type="text"
              value={formData.tournament}
              onChange={(e) => handleInputChange('tournament', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #bdc3c7',
                borderRadius: '4px',
              }}
              placeholder="Введите заголовок турнира"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Подзаголовок (название турнира)
            </label>
            <input
              type="text"
              value={formData.tournamentSubtitle}
              onChange={(e) => handleInputChange('tournamentSubtitle', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #bdc3c7',
                borderRadius: '4px',
              }}
              placeholder="Введите подзаголовок турнира"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Город, страна
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #bdc3c7',
                borderRadius: '4px',
              }}
              placeholder="Введите город и страну"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Место проведения
            </label>
            <input
              type="text"
              value={formData.venue}
              onChange={(e) => handleInputChange('venue', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #bdc3c7',
                borderRadius: '4px',
              }}
              placeholder="Введите место проведения"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Дата проведения
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid #bdc3c7',
                  borderRadius: '4px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Время начала
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => handleInputChange('time', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid #bdc3c7',
                  borderRadius: '4px',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Команды */}
      <div style={{
        backgroundColor: '#ecf0f1',
        padding: '1.5rem',
        borderRadius: '4px',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>Команды</h3>
          <button
            onClick={async () => {
              if (!match) return;
              
              if (!window.confirm('Вы уверены, что хотите поменять команды местами? Это действие изменит:\n- Названия команд\n- Цвета команд\n- Логотипы команд\n- Счет в текущей партии\n- Счет во всех завершенных партиях\n- Статистику команд')) {
                return;
              }

              try {
                if (window.electronAPI && window.electronAPI.swapTeams) {
                  const result = await window.electronAPI.swapTeams(match);
                  if (result.success) {
                    const swappedMatch = result.match;
                    
                    // Обновляем матч в Electron API
                    await window.electronAPI.setCurrentMatch(swappedMatch);
                    await window.electronAPI.setMobileMatch(swappedMatch);
                    
                    // Обновляем матч в родительском компоненте
                    if (onMatchChange) {
                      onMatchChange(swappedMatch);
                    }
                    
                    setMatch(swappedMatch);
                    
                    // Принудительно обновляем все данные в vMix при смене команд местами
                    // Это критически важно, так как меняются все данные команд
                    // Сбрасываем кэш логотипов перед обновлением, чтобы гарантировать их обновление
                    if (connectionStatus.connected) {
                      resetImageFieldsCache();
                      updateMatchData(swappedMatch, true);
                    }
                    
                    // Обновляем форму
                    setFormData({
                      tournament: swappedMatch.tournament || '',
                      tournamentSubtitle: swappedMatch.tournamentSubtitle || '',
                      location: swappedMatch.location || '',
                      venue: swappedMatch.venue || '',
                      date: swappedMatch.date || '',
                      time: swappedMatch.time || '',
                      teamAName: swappedMatch.teamA.name || '',
                      teamAColor: swappedMatch.teamA.color || '#3498db',
                      teamACity: swappedMatch.teamA.city || '',
                      teamBName: swappedMatch.teamB.name || '',
                      teamBColor: swappedMatch.teamB.color || '#e74c3c',
                      teamBCity: swappedMatch.teamB.city || '',
                      referee1: swappedMatch.officials?.referee1 || '',
                      referee2: swappedMatch.officials?.referee2 || '',
                      lineJudge1: swappedMatch.officials?.lineJudge1 || '',
                      lineJudge2: swappedMatch.officials?.lineJudge2 || '',
                      scorer: swappedMatch.officials?.scorer || '',
                    });
                    
                    alert('Команды успешно поменяны местами!');
                  } else {
                    alert('Ошибка при смене команд: ' + (result.error || 'Неизвестная ошибка'));
                  }
                } else {
                  alert('Electron API недоступен');
                }
              } catch (error) {
                console.error('Ошибка при смене команд:', error);
                alert('Ошибка при смене команд: ' + error.message);
              }
            }}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              backgroundColor: '#f39c12',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            title="Поменять команды местами (A ↔ B)"
          >
            <span>⇄</span>
            Поменять команды местами
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Команда А */}
          <div>
            <h4>Команда А</h4>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Название команды
                </label>
                <input
                  type="text"
                  value={formData.teamAName}
                  onChange={(e) => handleInputChange('teamAName', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '1rem',
                    border: '1px solid #bdc3c7',
                    borderRadius: '4px',
                  }}
                  placeholder="Название команды"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Цвет формы
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={formData.teamAColor}
                    onChange={(e) => handleInputChange('teamAColor', e.target.value)}
                    style={{
                      width: '60px',
                      height: '40px',
                      border: '1px solid #bdc3c7',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  />
                  <input
                    type="text"
                    value={formData.teamAColor}
                    onChange={(e) => handleInputChange('teamAColor', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      fontSize: '1rem',
                      border: '1px solid #bdc3c7',
                      borderRadius: '4px',
                    }}
                    placeholder="#3498db"
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Город
                </label>
                <input
                  type="text"
                  value={formData.teamACity}
                  onChange={(e) => handleInputChange('teamACity', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '1rem',
                    border: '1px solid #bdc3c7',
                    borderRadius: '4px',
                  }}
                  placeholder="Город команды"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Логотип команды
                </label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {match?.teamA?.logo && (
                    <img
                      src={match.teamA.logo}
                      alt="Логотип команды А"
                      style={{
                        width: '100px',
                        height: '100px',
                        objectFit: 'contain',
                        backgroundColor: 'white',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        border: '1px solid #bdc3c7',
                      }}
                    />
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                    <label style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#3498db',
                      color: 'white',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'inline-block',
                      textAlign: 'center',
                    }}>
                      {match?.teamA?.logo ? 'Изменить' : 'Загрузить'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async (event) => {
                            try {
                              const base64 = event.target.result;
                              // Изменяем размер изображения до 240px по длинной стороне
                              const resizedBase64 = await resizeImage(base64, 240);
                              const updatedMatch = {
                                ...match,
                                teamA: {
                                  ...match.teamA,
                                  logo: resizedBase64,
                                },
                                updatedAt: new Date().toISOString(),
                              };
                              setMatch(updatedMatch);
                            } catch (error) {
                              console.error('Ошибка при обработке изображения:', error);
                              alert('Ошибка при загрузке изображения: ' + error.message);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {match?.teamA?.logo && (
                      <button
                        onClick={() => {
                          const updatedMatch = {
                            ...match,
                            teamA: {
                              ...match.teamA,
                              logo: undefined,
                            },
                            updatedAt: new Date().toISOString(),
                          };
                          setMatch(updatedMatch);
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Команда Б */}
          <div>
            <h4>Команда Б</h4>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Название команды
                </label>
                <input
                  type="text"
                  value={formData.teamBName}
                  onChange={(e) => handleInputChange('teamBName', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '1rem',
                    border: '1px solid #bdc3c7',
                    borderRadius: '4px',
                  }}
                  placeholder="Название команды"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Цвет формы
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={formData.teamBColor}
                    onChange={(e) => handleInputChange('teamBColor', e.target.value)}
                    style={{
                      width: '60px',
                      height: '40px',
                      border: '1px solid #bdc3c7',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  />
                  <input
                    type="text"
                    value={formData.teamBColor}
                    onChange={(e) => handleInputChange('teamBColor', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      fontSize: '1rem',
                      border: '1px solid #bdc3c7',
                      borderRadius: '4px',
                    }}
                    placeholder="#e74c3c"
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Город
                </label>
                <input
                  type="text"
                  value={formData.teamBCity}
                  onChange={(e) => handleInputChange('teamBCity', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    fontSize: '1rem',
                    border: '1px solid #bdc3c7',
                    borderRadius: '4px',
                  }}
                  placeholder="Город команды"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                  Логотип команды
                </label>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {match?.teamB?.logo && (
                    <img
                      src={match.teamB.logo}
                      alt="Логотип команды Б"
                      style={{
                        width: '100px',
                        height: '100px',
                        objectFit: 'contain',
                        backgroundColor: 'white',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        border: '1px solid #bdc3c7',
                      }}
                    />
                  )}
                  <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                    <label style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#3498db',
                      color: 'white',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'inline-block',
                      textAlign: 'center',
                    }}>
                      {match?.teamB?.logo ? 'Изменить' : 'Загрузить'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async (event) => {
                            try {
                              const base64 = event.target.result;
                              // Изменяем размер изображения до 240px по длинной стороне
                              const resizedBase64 = await resizeImage(base64, 240);
                              const updatedMatch = {
                                ...match,
                                teamB: {
                                  ...match.teamB,
                                  logo: resizedBase64,
                                },
                                updatedAt: new Date().toISOString(),
                              };
                              setMatch(updatedMatch);
                            } catch (error) {
                              console.error('Ошибка при обработке изображения:', error);
                              alert('Ошибка при загрузке изображения: ' + error.message);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {match?.teamB?.logo && (
                      <button
                        onClick={() => {
                          const updatedMatch = {
                            ...match,
                            teamB: {
                              ...match.teamB,
                              logo: undefined,
                            },
                            updatedAt: new Date().toISOString(),
                          };
                          setMatch(updatedMatch);
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#e74c3c',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Судейская коллегия */}
      <div style={{
        backgroundColor: '#ecf0f1',
        padding: '1.5rem',
        borderRadius: '4px',
        marginBottom: '1.5rem',
      }}>
        <h3 style={{ marginTop: 0 }}>Судейская коллегия</h3>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Главный судья
              </label>
              <input
                type="text"
                value={formData.referee1}
                onChange={(e) => handleInputChange('referee1', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid #bdc3c7',
                  borderRadius: '4px',
                }}
                placeholder="Имя главного судьи"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Второй судья
              </label>
              <input
                type="text"
                value={formData.referee2}
                onChange={(e) => handleInputChange('referee2', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid #bdc3c7',
                  borderRadius: '4px',
                }}
                placeholder="Имя второго судьи"
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Судья на линии 1
              </label>
              <input
                type="text"
                value={formData.lineJudge1}
                onChange={(e) => handleInputChange('lineJudge1', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid #bdc3c7',
                  borderRadius: '4px',
                }}
                placeholder="Имя судьи на линии"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Судья на линии 2
              </label>
              <input
                type="text"
                value={formData.lineJudge2}
                onChange={(e) => handleInputChange('lineJudge2', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  fontSize: '1rem',
                  border: '1px solid #bdc3c7',
                  borderRadius: '4px',
                }}
                placeholder="Имя судьи на линии"
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Секретарь
            </label>
            <input
              type="text"
              value={formData.scorer}
              onChange={(e) => handleInputChange('scorer', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '1rem',
                border: '1px solid #bdc3c7',
                borderRadius: '4px',
              }}
              placeholder="Имя секретаря"
            />
          </div>
        </div>
      </div>

      {/* Кнопки */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        justifyContent: 'flex-end',
      }}>
        <button
          onClick={handleCancel}
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
          Сохранить изменения
        </button>
      </div>
    </div>
  );
}

export default MatchSettingsPage;

