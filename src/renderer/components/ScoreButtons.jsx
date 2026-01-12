
function ScoreButtons({ teamAName, teamBName, onScoreChange }) {
  const buttonStyle = {
    padding: '1rem 2rem',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    minWidth: '120px',
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '1rem',
      marginBottom: '1rem',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>{teamAName}</div>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button
            onClick={() => onScoreChange('A', -1)}
            style={{
              ...buttonStyle,
              backgroundColor: '#e74c3c',
              color: 'white',
            }}
          >
            -1
          </button>
          <button
            onClick={() => onScoreChange('A', 1)}
            style={{
              ...buttonStyle,
              backgroundColor: '#27ae60',
              color: 'white',
            }}
          >
            +1
          </button>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>{teamBName}</div>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
          <button
            onClick={() => onScoreChange('B', -1)}
            style={{
              ...buttonStyle,
              backgroundColor: '#e74c3c',
              color: 'white',
            }}
          >
            -1
          </button>
          <button
            onClick={() => onScoreChange('B', 1)}
            style={{
              ...buttonStyle,
              backgroundColor: '#27ae60',
              color: 'white',
            }}
          >
            +1
          </button>
        </div>
      </div>
    </div>
  );
}

export default ScoreButtons;

