import React, { memo } from 'react';

const SetsDisplay = memo(function SetsDisplay({ sets, currentSetNumber }) {
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
          const isCurrent = setNum === currentSetNumber;
          
          if (set && set.completed) {
            return (
              <div
                key={setNum}
                style={{
                  padding: '0.5rem',
                  backgroundColor: '#27ae60',
                  color: 'white',
                  borderRadius: '4px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.8rem' }}>Партия {setNum}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {set.scoreA} - {set.scoreB}
                </div>
              </div>
            );
          } else if (isCurrent) {
            return (
              <div
                key={setNum}
                style={{
                  padding: '0.5rem',
                  backgroundColor: '#3498db',
                  color: 'white',
                  borderRadius: '4px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.8rem' }}>Партия {setNum}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Текущая</div>
              </div>
            );
          } else {
            return (
              <div
                key={setNum}
                style={{
                  padding: '0.5rem',
                  backgroundColor: '#bdc3c7',
                  color: '#7f8c8d',
                  borderRadius: '4px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.8rem' }}>Партия {setNum}</div>
                <div style={{ fontSize: '1.2rem' }}>-</div>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
});

export default SetsDisplay;

