import { memo } from 'react';
import { SET_STATUS } from '../../shared/types/Match';
import { formatDuration } from '../../shared/timeUtils';
// @ts-ignore - временно, пока не будет TypeScript версии
import { SetDomain } from '../../shared/domain/SetDomain.ts';

function SetsDisplay({ 
  sets, 
  currentSet,
  onSetClick
}) {
  // Логирование для диагностики (временно)
  console.log('[SetsDisplay] Рендер:', {
    setsCount: sets.length,
    sets: sets.map(s => ({ setNumber: s.setNumber, scoreA: s.scoreA, scoreB: s.scoreB, status: s.status })),
    currentSet: { setNumber: currentSet.setNumber, status: currentSet.status, scoreA: currentSet.scoreA, scoreB: currentSet.scoreB },
  });
  return (
    <div style={{
      backgroundColor: '#ecf0f1',
      padding: '1rem',
      borderRadius: '4px',
      marginBottom: '1rem',
    }}>
      <h3 style={{ marginTop: 0 }}>Счет по партиям:</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
        {[1, 2, 3, 4, 5].map((setNum) => {
          const set = sets.find(s => s.setNumber === setNum);
          // Используем Domain Layer для проверки, является ли это текущей партией
          const isCurrent = SetDomain.isCurrentSet(setNum, currentSet);
          
          // Приоритет: если партия завершена в sets, показываем как завершенную
          // даже если currentSet имеет тот же номер (новая партия еще не начата)
          const isCompleted = set && SetDomain.isCompleted(set);
          const isInProgress = isCurrent && currentSet.status === SET_STATUS.IN_PROGRESS && !isCompleted;
          
          // Определяем стили в зависимости от статуса
          let backgroundColor, color, content;
          // Определяем, можно ли редактировать партию (нельзя, если она не начата)
          const canEdit = isCompleted || isInProgress;
          
          if (isCompleted) {
            // Завершенная партия (приоритет над текущей)
            backgroundColor = '#27ae60';
            color = 'white';
            // Показываем длительность, даже если она равна 0
            const duration = (set.duration !== null && set.duration !== undefined) ? formatDuration(set.duration) : '';
            content = (
              <>
                <div style={{ fontSize: '0.8rem' }}>Партия {setNum}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {set.scoreA} - {set.scoreB}
                </div>
                {duration && (
                  <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>
                    {duration}
                  </div>
                )}
              </>
            );
          } else if (isInProgress) {
            // Текущая партия в игре
            backgroundColor = '#3498db';
            color = 'white';
            content = (
              <>
                <div style={{ fontSize: '0.8rem' }}>Партия {setNum}</div>
                <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>В игре</div>
                <div style={{ fontSize: '1rem' }}>
                  {currentSet.scoreA} - {currentSet.scoreB}
                </div>
              </>
            );
          } else {
            // Партия не начата
            backgroundColor = '#bdc3c7';
            color = '#7f8c8d';
            content = (
              <>
                <div style={{ fontSize: '0.8rem' }}>Партия {setNum}</div>
                <div style={{ fontSize: '1.2rem' }}>-</div>
              </>
            );
          }
          
          return (
            <div
              key={setNum}
              onClick={() => canEdit && onSetClick && onSetClick(setNum)}
              style={{
                padding: '0.5rem',
                backgroundColor,
                color,
                borderRadius: '4px',
                textAlign: 'center',
                cursor: (canEdit && onSetClick) ? 'pointer' : 'default',
                transition: 'opacity 0.2s',
                opacity: canEdit ? 1 : 0.7,
              }}
              onMouseEnter={(e) => {
                if (canEdit && onSetClick) {
                  e.currentTarget.style.opacity = '0.8';
                }
              }}
              onMouseLeave={(e) => {
                if (canEdit && onSetClick) {
                  e.currentTarget.style.opacity = '1';
                } else {
                  e.currentTarget.style.opacity = '0.7';
                }
              }}
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Кастомная функция сравнения для memo
const areEqual = (prevProps, nextProps) => {
  // Сравниваем количество партий и их содержимое
  if (prevProps.sets.length !== nextProps.sets.length) {
    return false; // Разное количество - нужно пересчитать
  }
  
  // Сравниваем каждую партию (важно: сравниваем по setNumber, а не по индексу)
  const prevSetsMap = new Map(prevProps.sets.map(s => [s.setNumber, s]));
  const nextSetsMap = new Map(nextProps.sets.map(s => [s.setNumber, s]));
  
  // Проверяем все setNumber из обоих массивов
  const allSetNumbers = new Set([
    ...prevProps.sets.map(s => s.setNumber),
    ...nextProps.sets.map(s => s.setNumber)
  ]);
  
  for (const setNumber of allSetNumbers) {
    const prevSet = prevSetsMap.get(setNumber);
    const nextSet = nextSetsMap.get(setNumber);
    
    // Если одна партия есть в одном массиве, но нет в другом - нужно пересчитать
    if (!prevSet || !nextSet) {
      return false;
    }
    
    // Сравниваем важные поля
    if (prevSet.setNumber !== nextSet.setNumber ||
        prevSet.scoreA !== nextSet.scoreA ||
        prevSet.scoreB !== nextSet.scoreB ||
        prevSet.status !== nextSet.status ||
        prevSet.completed !== nextSet.completed) {
      return false; // Найдены различия - нужно пересчитать
    }
  }
  
  // Сравниваем currentSet
  if (prevProps.currentSet.setNumber !== nextProps.currentSet.setNumber ||
      prevProps.currentSet.status !== nextProps.currentSet.status ||
      prevProps.currentSet.scoreA !== nextProps.currentSet.scoreA ||
      prevProps.currentSet.scoreB !== nextProps.currentSet.scoreB) {
    return false; // currentSet изменился - нужно пересчитать
  }
  
  return true; // Нет изменений - можно пропустить пересчет
};

export default memo(SetsDisplay, areEqual);

