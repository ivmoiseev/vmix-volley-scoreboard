import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useVMix } from '../hooks/useVMix';

const POSITIONS = [
  'Не указано',
  'Нападающий',
  'Связующий',
  'Доигровщик',
  'Центральный блокирующий',
  'Либеро',
];

function RosterManagementPage({ match: propMatch, onMatchChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const matchFromState = location.state?.match;

  // Используем match из пропсов, затем из state
  const [match, setMatch] = useState(propMatch || matchFromState || null);
  
  // Получаем updateMatchData из useVMix для принудительного обновления при сохранении
  const { updateMatchData, connectionStatus } = useVMix(match);
  
  const [selectedTeam, setSelectedTeam] = useState('A');
  const [roster, setRoster] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null); // Для стартового состава
  const [draggedRosterIndex, setDraggedRosterIndex] = useState(null); // Для основного списка

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

    updateRoster();
  }, [match, selectedTeam, navigate]);

  const updateRoster = () => {
    const team = selectedTeam === 'A' ? match.teamA : match.teamB;
    setRoster(team.roster || []);
  };

  // Получает стартовый состав с учетом порядка из startingLineupOrder
  const getOrderedStarters = () => {
    const team = selectedTeam === 'A' ? match.teamA : match.teamB;
    const teamRoster = team.roster || [];
    const starters = teamRoster.filter(p => p.isStarter);
    
    // Если есть сохраненный порядок, используем его
    if (team.startingLineupOrder && Array.isArray(team.startingLineupOrder) && team.startingLineupOrder.length > 0) {
      // startingLineupOrder содержит индексы игроков из roster в порядке стартового состава
      const orderedStarters = team.startingLineupOrder
        .map(index => teamRoster[index])
        .filter(player => player && player.isStarter); // Фильтруем только стартовых
      
      // Добавляем стартовых игроков, которых нет в startingLineupOrder (на случай добавления новых)
      starters.forEach(player => {
        const rosterIndex = teamRoster.findIndex(p => 
          p.number === player.number && 
          p.name === player.name && 
          p.isStarter === true
        );
        if (rosterIndex !== -1 && !team.startingLineupOrder.includes(rosterIndex)) {
          orderedStarters.push(player);
        }
      });
      
      return orderedStarters;
    }
    
    // Если порядка нет, возвращаем стартовых игроков в порядке их появления в roster
    return starters;
  };

  const handleAddPlayer = () => {
    // Генерируем следующий номер, учитывая, что могут быть игроки без номера (null/undefined)
    let nextNumber = 1;
    if (roster.length > 0) {
      const numbers = roster
        .map(p => p.number)
        .filter(num => num != null && !isNaN(num) && num > 0);
      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1;
      }
    }

    const newPlayer = {
      number: nextNumber,
      name: '',
      position: POSITIONS[0],
      isStarter: false,
    };

    const updatedRoster = [...roster, newPlayer];
    updateTeamRoster(updatedRoster);
  };

  const handleRemovePlayer = (index) => {
    const updatedRoster = roster.filter((_, i) => i !== index);
    
    // Обновляем startingLineupOrder: уменьшаем индексы больше удаленного, убираем сам удаленный индекс
    const team = selectedTeam === 'A' ? match.teamA : match.teamB;
    const currentStartingLineupOrder = team.startingLineupOrder || [];
    const newStartingLineupOrder = currentStartingLineupOrder
      .filter(i => i !== index) // Убираем удаленный индекс
      .map(i => i > index ? i - 1 : i); // Уменьшаем индексы после удаленного
    
    updateTeamRoster(updatedRoster, newStartingLineupOrder);
  };

  const handlePlayerChange = (index, field, value) => {
    const updatedRoster = roster.map((player, i) => {
      if (i === index) {
        // Для номера игрока: разрешаем пустое значение (null) и проверяем, что значение не отрицательное
        if (field === 'number') {
          // Если значение null, undefined или пустая строка, разрешаем отсутствие номера
          if (value === null || value === undefined || value === '') {
            return { ...player, [field]: null };
          }
          const numValue = parseInt(value, 10);
          // Если значение не число или отрицательное, устанавливаем null (без номера)
          if (isNaN(numValue) || numValue < 0) {
            return { ...player, [field]: null };
          }
          return { ...player, [field]: numValue };
        }
        return { ...player, [field]: value };
      }
      return player;
    });
    updateTeamRoster(updatedRoster);
  };

  const handleToggleStarter = (index) => {
    const updatedRoster = roster.map((player, i) => {
      if (i === index) {
        return { ...player, isStarter: !player.isStarter };
      }
      return player;
    });
    
    // Обновляем startingLineupOrder при изменении статуса стартового игрока
    const team = selectedTeam === 'A' ? match.teamA : match.teamB;
    let newStartingLineupOrder = team.startingLineupOrder || [];
    
    const player = updatedRoster[index];
    if (player.isStarter) {
      // Игрок добавлен в стартовый состав - добавляем его индекс в конец
      if (!newStartingLineupOrder.includes(index)) {
        newStartingLineupOrder = [...newStartingLineupOrder, index];
      }
    } else {
      // Игрок удален из стартового состава - убираем его индекс
      newStartingLineupOrder = newStartingLineupOrder.filter(i => i !== index);
    }
    
    updateTeamRoster(updatedRoster, newStartingLineupOrder);
  };

  // Функции для drag and drop стартового состава
  const handleDragStart = (e, cellIndex) => {
    setDraggedIndex(cellIndex);
    e.dataTransfer.effectAllowed = 'move';
    // Добавляем стиль для drag элемента
    if (e.target.style) {
      e.target.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e) => {
    if (e.target.style) {
      e.target.style.opacity = '1';
    }
    setDraggedIndex(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnCell = (targetCellIndex) => {
    if (draggedIndex === null || draggedIndex === targetCellIndex) {
      return;
    }

    // Создаем массив из 8 слотов для стартовых игроков
    const slots = Array(8).fill(null);
    
    // Заполняем слоты текущими стартовыми игроками
    starters.forEach((player, index) => {
      if (index < 8) {
        slots[index] = player;
      }
    });

    // Перемещаем игрока из одной ячейки в другую
    const playerToMove = slots[draggedIndex];
    const playerAtTarget = slots[targetCellIndex];
    
    slots[draggedIndex] = playerAtTarget;
    slots[targetCellIndex] = playerToMove;

    // Находим индексы игроков в roster для сохранения порядка
    const newStartingLineupOrder = slots
      .filter(p => p !== null)
      .map(player => {
        return roster.findIndex(p => 
          p.number === player.number && 
          p.name === player.name && 
          p.isStarter === true
        );
      })
      .filter(index => index !== -1);

    // Обновляем только startingLineupOrder, не меняя порядок в roster
    const updatedMatch = { ...match };
    if (selectedTeam === 'A') {
      updatedMatch.teamA = {
        ...updatedMatch.teamA,
        startingLineupOrder: newStartingLineupOrder,
      };
    } else {
      updatedMatch.teamB = {
        ...updatedMatch.teamB,
        startingLineupOrder: newStartingLineupOrder,
      };
    }
    updatedMatch.updatedAt = new Date().toISOString();
    setMatch(updatedMatch);
    
    // Обновляем матч в родительском компоненте и Electron API
    if (onMatchChange) {
      onMatchChange(updatedMatch);
    }
    
    if (window.electronAPI) {
      window.electronAPI.setCurrentMatch(updatedMatch).catch(err => {
        console.error('Ошибка при обновлении матча:', err);
      });
      window.electronAPI.setMobileMatch(updatedMatch).catch(err => {
        console.error('Ошибка при обновлении мобильного матча:', err);
      });
    }

    setDraggedIndex(null);
  };

  // Функции для drag and drop основного списка игроков
  const handleRosterDragStart = (e, index) => {
    setDraggedRosterIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Добавляем стиль для drag элемента
    if (e.currentTarget.parentElement && e.currentTarget.parentElement.style) {
      e.currentTarget.parentElement.style.opacity = '0.5';
    }
  };

  const handleRosterDragEnd = (e) => {
    if (e.currentTarget.parentElement && e.currentTarget.parentElement.style) {
      e.currentTarget.parentElement.style.opacity = '1';
    }
    setDraggedRosterIndex(null);
  };

  const handleRosterDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Добавляем визуальную обратную связь
    if (e.currentTarget && e.currentTarget.style) {
      e.currentTarget.style.backgroundColor = '#e8f5e9';
    }
  };

  const handleRosterDragLeave = (e) => {
    // Убираем визуальную обратную связь
    if (e.currentTarget && e.currentTarget.style) {
      e.currentTarget.style.backgroundColor = '';
    }
  };

  const handleRosterDrop = (e, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedRosterIndex === null || draggedRosterIndex === targetIndex) {
      return;
    }

    const team = selectedTeam === 'A' ? match.teamA : match.teamB;
    const oldStartingLineupOrder = team.startingLineupOrder || [];

    // Создаем новый массив с переупорядоченными игроками
    const newRoster = [...roster];
    
    // Удаляем элемент из исходной позиции
    const [draggedPlayer] = newRoster.splice(draggedRosterIndex, 1);
    
    // Вычисляем позицию вставки
    // Цель: элемент должен оказаться на позиции targetIndex в итоговом массиве
    // splice(index, 0, element) вставляет элемент ПЕРЕД позицией index
    //
    // Пример: [A(0), B(1), C(2)], перетаскиваем A на позицию 1 (на строку с B)
    // Ожидаем: [B(0), A(1), C(2)]
    // 1. Удаляем A: [B(0), C(1)] - индексы сдвинулись влево
    // 2. После удаления B теперь на позиции 0, но нам нужно, чтобы A был на позиции 1
    // 3. Вставляем на позицию 1 (перед C): [B(0), A(1), C(2)] ✓
    //
    // Пример: [A(0), B(1), C(2)], перетаскиваем C на позицию 0 (на строку с A)
    // Ожидаем: [C(0), A(1), B(2)]
    // 1. Удаляем C: [A(0), B(1)] - индексы до C не меняются
    // 2. Вставляем на позицию 0 (перед A): [C(0), A(1), B(2)] ✓
    //
    // Вывод: после удаления элемента, для вставки на позицию targetIndex
    // нужно использовать splice(targetIndex, 0, element) в обоих случаях
    const insertIndex = targetIndex;
    
    newRoster.splice(insertIndex, 0, draggedPlayer);

    // Проверяем: элемент должен быть на позиции targetIndex в newRoster
    // Обновляем startingLineupOrder: создаем мапу старых индексов на новые
    const indexMap = new Map();
    
    for (let oldIndex = 0; oldIndex < roster.length; oldIndex++) {
      let newIndex;
      
      if (oldIndex === draggedRosterIndex) {
        // Сам перетаскиваемый элемент - он попадает на targetIndex
        newIndex = targetIndex;
      } else if (targetIndex > draggedRosterIndex) {
        // Перетаскиваем вниз (вправо по массиву)
        if (oldIndex < draggedRosterIndex) {
          newIndex = oldIndex; // До исходной позиции - без изменений
        } else if (oldIndex > draggedRosterIndex && oldIndex <= targetIndex) {
          // Между исходной и целевой (включая целевую) - сдвигаются влево на 1
          newIndex = oldIndex - 1;
        } else {
          // oldIndex > targetIndex - остаются на своих местах
          newIndex = oldIndex;
        }
      } else {
        // targetIndex < draggedRosterIndex - перетаскиваем вверх (влево по массиву)
        if (oldIndex < targetIndex) {
          newIndex = oldIndex; // До целевой позиции - без изменений
        } else if (oldIndex >= targetIndex && oldIndex < draggedRosterIndex) {
          // Между целевой (включая) и исходной - сдвигаются вправо на 1
          newIndex = oldIndex + 1;
        } else {
          // oldIndex > draggedRosterIndex - остаются на своих местах
          newIndex = oldIndex;
        }
      }
      
      indexMap.set(oldIndex, newIndex);
    }
    
    // Обновляем startingLineupOrder с новыми индексами
    const newStartingLineupOrder = oldStartingLineupOrder
      .map(oldIndex => indexMap.get(oldIndex))
      .filter(newIndex => newIndex !== undefined && newIndex >= 0 && newIndex < newRoster.length)
      .filter(newIndex => newRoster[newIndex] && newRoster[newIndex].isStarter);

    // Обновляем состав
    updateTeamRoster(newRoster, newStartingLineupOrder);
    setDraggedRosterIndex(null);
  };

  const updateTeamRoster = (newRoster, newStartingLineupOrder = null) => {
    setRoster(newRoster);
    
    const updatedMatch = { ...match };
    const teamData = {
      roster: newRoster,
    };
    
    // Обновляем startingLineupOrder только если он передан явно
    // Если не передан, проверяем и очищаем невалидные индексы
    if (newStartingLineupOrder !== null) {
      teamData.startingLineupOrder = newStartingLineupOrder;
    } else {
      // Проверяем валидность существующего startingLineupOrder
      const currentStartingLineupOrder = (selectedTeam === 'A' ? match.teamA : match.teamB).startingLineupOrder || [];
      const validStartingLineupOrder = currentStartingLineupOrder.filter(index => 
        index >= 0 && 
        index < newRoster.length && 
        newRoster[index].isStarter
      );
      if (validStartingLineupOrder.length !== currentStartingLineupOrder.length) {
        teamData.startingLineupOrder = validStartingLineupOrder;
      }
    }
    
    if (selectedTeam === 'A') {
      updatedMatch.teamA = {
        ...updatedMatch.teamA,
        ...teamData,
      };
    } else {
      updatedMatch.teamB = {
        ...updatedMatch.teamB,
        ...teamData,
      };
    }
    updatedMatch.updatedAt = new Date().toISOString();
    setMatch(updatedMatch);
    
    // Обновляем матч в родительском компоненте и Electron API
    if (onMatchChange) {
      onMatchChange(updatedMatch);
    }
    
    if (window.electronAPI) {
      window.electronAPI.setCurrentMatch(updatedMatch).catch(err => {
        console.error('Ошибка при обновлении матча:', err);
      });
      window.electronAPI.setMobileMatch(updatedMatch).catch(err => {
        console.error('Ошибка при обновлении мобильного матча:', err);
      });
    }
  };


  const handleSave = async () => {
    if (!match) return;
    
    // Обновляем матч в Electron API
    if (window.electronAPI) {
      try {
        await window.electronAPI.setCurrentMatch(match);
        await window.electronAPI.setMobileMatch(match);
      } catch (error) {
        console.error('Ошибка при сохранении матча:', error);
      }
    }
    
    // Обновляем матч в родительском компоненте
    if (onMatchChange) {
      onMatchChange(match);
    }
    
    // Принудительно обновляем все данные в vMix при сохранении списков команд
    if (connectionStatus.connected) {
      updateMatchData(match, true);
    }
    
    navigate('/match', { state: { match } });
  };

  const handleExportRoster = () => {
    const team = selectedTeam === 'A' ? match.teamA : match.teamB;
    // Экспортируем состав и тренера вместе
    const exportData = {
      coach: team.coach || '',
      roster: team.roster || [],
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `roster_${team.name}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportRoster = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        // Проверяем формат: объект с полями coach и roster
        if (!importedData.roster || !Array.isArray(importedData.roster)) {
          alert('Некорректный формат файла. Ожидается объект с полями "roster" (массив) и "coach" (строка)');
          return;
        }
        
        const importedRoster = importedData.roster;
        const importedCoach = importedData.coach || '';
        
        // Инициализируем startingLineupOrder для импортированного состава
        // Порядок определяется по порядку игроков в массиве, где isStarter === true
        const importedStartingLineupOrder = importedRoster
          .map((player, index) => player.isStarter ? index : null)
          .filter(index => index !== null);
        
        // Обновляем состав и тренера одновременно
        const updatedMatch = { ...match };
        if (selectedTeam === 'A') {
          updatedMatch.teamA = {
            ...updatedMatch.teamA,
            roster: importedRoster,
            startingLineupOrder: importedStartingLineupOrder,
            coach: importedCoach,
          };
        } else {
          updatedMatch.teamB = {
            ...updatedMatch.teamB,
            roster: importedRoster,
            startingLineupOrder: importedStartingLineupOrder,
            coach: importedCoach,
          };
        }
        updatedMatch.updatedAt = new Date().toISOString();
        setMatch(updatedMatch);
        setRoster(importedRoster); // Обновляем локальное состояние ростра
        
        // Обновляем матч в родительском компоненте и Electron API
        if (onMatchChange) {
          onMatchChange(updatedMatch);
        }
        
        if (window.electronAPI) {
          window.electronAPI.setCurrentMatch(updatedMatch).catch(err => {
            console.error('Ошибка при обновлении матча:', err);
          });
          window.electronAPI.setMobileMatch(updatedMatch).catch(err => {
            console.error('Ошибка при обновлении мобильного матча:', err);
          });
        }
        
        alert('Состав и тренер успешно импортированы!');
      } catch (error) {
        alert('Ошибка при чтении файла: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  if (!match) {
    return null;
  }

  const team = selectedTeam === 'A' ? match.teamA : match.teamB;
  const starters = getOrderedStarters();

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>Управление составами команд</h2>

      {/* Выбор команды */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <button
          onClick={() => setSelectedTeam('A')}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: selectedTeam === 'A' ? match.teamA.color : '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: selectedTeam === 'A' ? 'bold' : 'normal',
          }}
        >
          {match.teamA.name}
        </button>
        <button
          onClick={() => setSelectedTeam('B')}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: selectedTeam === 'B' ? match.teamB.color : '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: selectedTeam === 'B' ? 'bold' : 'normal',
          }}
        >
          {match.teamB.name}
        </button>
      </div>

      {/* Состав команды */}
      <div style={{
        backgroundColor: '#ecf0f1',
        padding: '1.5rem',
        borderRadius: '4px',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
        }}>
          <h3 style={{ marginTop: 0 }}>Состав команды</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <label style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#27ae60',
              color: 'white',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'inline-block',
            }}>
              Импорт
              <input
                type="file"
                accept=".json"
                onChange={handleImportRoster}
                style={{ display: 'none' }}
              />
            </label>
            <button
              onClick={handleExportRoster}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Экспорт
            </button>
            <button
              onClick={handleAddPlayer}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Добавить игрока
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            borderRadius: '4px',
          }}>
            <thead>
              <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', width: '30px' }}></th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>№</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Имя</th>
                <th style={{ padding: '0.75rem', textAlign: 'left' }}>Позиция</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Стартовый</th>
                <th style={{ padding: '0.75rem', textAlign: 'center' }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((player, index) => (
                <tr 
                  key={index} 
                  style={{ 
                    borderBottom: '1px solid #ecf0f1',
                    opacity: draggedRosterIndex === index ? 0.5 : 1,
                    cursor: 'move',
                  }}
                  draggable
                  onDragStart={(e) => handleRosterDragStart(e, index)}
                  onDragEnd={handleRosterDragEnd}
                  onDragOver={handleRosterDragOver}
                  onDragLeave={handleRosterDragLeave}
                  onDrop={(e) => {
                    handleRosterDrop(e, index);
                    handleRosterDragLeave(e);
                  }}
                >
                  <td 
                    style={{ 
                      padding: '0.75rem',
                      textAlign: 'center',
                      cursor: 'grab',
                      userSelect: 'none',
                      color: '#7f8c8d',
                    }}
                    title="Перетащите для изменения порядка"
                  >
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <div style={{
                        width: '16px',
                        height: '2px',
                        backgroundColor: '#7f8c8d',
                        borderRadius: '1px',
                      }}></div>
                      <div style={{
                        width: '16px',
                        height: '2px',
                        backgroundColor: '#7f8c8d',
                        borderRadius: '1px',
                      }}></div>
                      <div style={{
                        width: '16px',
                        height: '2px',
                        backgroundColor: '#7f8c8d',
                        borderRadius: '1px',
                      }}></div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <input
                      type="number"
                      min="0"
                      value={player.number ?? ''}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        // Если поле пустое или содержит только минус, разрешаем отсутствие номера (null)
                        if (inputValue === '' || inputValue === '-') {
                          handlePlayerChange(index, 'number', null);
                          return;
                        }
                        // Парсим значение и передаем в handlePlayerChange, который сам проверит на отрицательное
                        const numValue = parseInt(inputValue, 10);
                        handlePlayerChange(index, 'number', isNaN(numValue) ? null : numValue);
                      }}
                      onBlur={(e) => {
                        // При потере фокуса проверяем значение и корректируем, если нужно
                        const inputValue = e.target.value;
                        if (inputValue === '' || inputValue === '-') {
                          handlePlayerChange(index, 'number', null);
                          return;
                        }
                        const numValue = parseInt(inputValue, 10);
                        if (numValue < 0 || isNaN(numValue)) {
                          handlePlayerChange(index, 'number', null);
                        }
                      }}
                      placeholder="Без номера"
                      style={{
                        width: '80px',
                        padding: '0.25rem',
                        border: '1px solid #bdc3c7',
                        borderRadius: '4px',
                      }}
                    />
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) => handlePlayerChange(index, 'name', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.25rem',
                        border: '1px solid #bdc3c7',
                        borderRadius: '4px',
                      }}
                      placeholder="Имя игрока"
                    />
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <select
                      value={player.position}
                      onChange={(e) => handlePlayerChange(index, 'position', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.25rem',
                        border: '1px solid #bdc3c7',
                        borderRadius: '4px',
                      }}
                    >
                      {POSITIONS.map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={player.isStarter}
                      onChange={() => handleToggleStarter(index)}
                    />
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                    <button
                      onClick={() => handleRemovePlayer(index)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {roster.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#7f8c8d' }}>
              Состав пуст. Добавьте игроков.
            </div>
          )}
        </div>
        
        {/* Поле тренера под списком команды */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '2px solid #bdc3c7' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Тренер
          </label>
          <input
            type="text"
            value={team.coach || ''}
            onChange={(e) => {
              const updatedMatch = { ...match };
              if (selectedTeam === 'A') {
                updatedMatch.teamA = {
                  ...updatedMatch.teamA,
                  coach: e.target.value,
                };
              } else {
                updatedMatch.teamB = {
                  ...updatedMatch.teamB,
                  coach: e.target.value,
                };
              }
              updatedMatch.updatedAt = new Date().toISOString();
              setMatch(updatedMatch);
              
              // Обновляем матч в родительском компоненте и Electron API
              if (onMatchChange) {
                onMatchChange(updatedMatch);
              }
              
              if (window.electronAPI) {
                window.electronAPI.setCurrentMatch(updatedMatch).catch(err => {
                  console.error('Ошибка при обновлении матча:', err);
                });
                window.electronAPI.setMobileMatch(updatedMatch).catch(err => {
                  console.error('Ошибка при обновлении мобильного матча:', err);
                });
              }
            }}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '0.5rem',
              fontSize: '1rem',
              border: '1px solid #bdc3c7',
              borderRadius: '4px',
            }}
            placeholder="Имя тренера"
          />
        </div>
      </div>

      {/* Стартовый состав */}
      {starters.length > 0 && (
        <div style={{
          backgroundColor: '#ecf0f1',
          padding: '1.5rem',
          borderRadius: '4px',
          marginBottom: '1.5rem',
        }}>
          <h3 style={{ marginTop: 0 }}>Стартовый состав</h3>
          <p style={{ marginTop: '-0.5rem', marginBottom: '1rem', fontSize: '0.9rem', color: '#7f8c8d' }}>
            Перетащите игроков для изменения порядка
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem',
          }}>
            {Array.from({ length: 8 }).map((_, cellIndex) => {
              const player = starters[cellIndex] || null;
              const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI'];
              const isReserve = cellIndex >= 6;

              return (
                <div
                  key={`cell-${cellIndex}`}
                  onDragOver={handleDragOver}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draggedIndex !== null) {
                      handleDropOnCell(cellIndex);
                    }
                  }}
                  style={{
                    minHeight: '80px',
                    border: `2px ${isReserve ? 'solid' : 'dashed'} ${draggedIndex === cellIndex ? '#229954' : '#bdc3c7'}`,
                    borderRadius: '4px',
                    padding: '0.75rem',
                    backgroundColor: player ? (draggedIndex === cellIndex ? '#229954' : '#27ae60') : 'white',
                    color: player ? 'white' : '#7f8c8d',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background-color 0.2s, border-color 0.2s',
                    opacity: draggedIndex === cellIndex ? 0.6 : 1,
                  }}
                  onDragEnter={(e) => {
                    if (!player && draggedIndex !== null) {
                      e.currentTarget.style.backgroundColor = '#d5f4e6';
                      e.currentTarget.style.borderColor = '#27ae60';
                      e.currentTarget.style.borderStyle = 'solid';
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!player) {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.borderColor = '#bdc3c7';
                      e.currentTarget.style.borderStyle = isReserve ? 'solid' : 'dashed';
                    }
                  }}
                >
                  {/* Подпись ячейки */}
                  <div style={{
                    position: 'absolute',
                    top: '0.25rem',
                    left: '0.5rem',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    opacity: 0.7,
                  }}>
                    {!isReserve ? romanNumerals[cellIndex] : ''}
                  </div>
                  
                  {/* Игрок в ячейке */}
                  {player ? (
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, cellIndex)}
                      onDragEnd={handleDragEnd}
                      style={{
                        width: '100%',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        cursor: 'move',
                        userSelect: 'none',
                      }}
                    >
                      {player.number != null ? `№${player.number}` : 'Без номера'} {player.name}
                    </div>
                  ) : (
                    <div style={{
                      fontSize: '0.85rem',
                      textAlign: 'center',
                      opacity: 0.5,
                    }}>
                      {isReserve ? 'Запасной' : 'Пусто'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Кнопки */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        justifyContent: 'flex-end',
      }}>
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
          Сохранить и вернуться
        </button>
      </div>
    </div>
  );
}

export default RosterManagementPage;

