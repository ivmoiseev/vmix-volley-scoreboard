import React from 'react';

function ServeControl({ servingTeam, teamAName, teamBName, onChange }) {
  const servingTeamName = servingTeam === 'A' ? teamAName : teamBName;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1rem',
      padding: '0.5rem',
      backgroundColor: '#ecf0f1',
      borderRadius: '4px',
      marginBottom: '1rem',
    }}>
      <span>Подача:</span>
      <span style={{ fontWeight: 'bold', color: '#3498db' }}>{servingTeamName}</span>
      <button
        onClick={() => onChange('prev')}
        style={{
          padding: '0.25rem 0.5rem',
          fontSize: '1rem',
          backgroundColor: '#95a5a6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        ◄
      </button>
      <button
        onClick={() => onChange('next')}
        style={{
          padding: '0.25rem 0.5rem',
          fontSize: '1rem',
          backgroundColor: '#95a5a6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        ►
      </button>
    </div>
  );
}

export default ServeControl;

