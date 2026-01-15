
function ScoreButtons({ teamAName, teamBName, onScoreChange, disabled = false }) {
  const buttonStyle = {
    padding: '1rem 2rem',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    minWidth: '120px',
    opacity: disabled ? 0.6 : 1,
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
            onClick={() => !disabled && onScoreChange('A', -1)}
            disabled={disabled}
            style={{
              ...buttonStyle,
              backgroundColor: '#e74c3c',
              color: 'white',
            }}
          >
            -1
          </button>
          <button
            onClick={() => !disabled && onScoreChange('A', 1)}
            disabled={disabled}
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
            onClick={() => !disabled && onScoreChange('B', -1)}
            disabled={disabled}
            style={{
              ...buttonStyle,
              backgroundColor: '#e74c3c',
              color: 'white',
            }}
          >
            -1
          </button>
          <button
            onClick={() => !disabled && onScoreChange('B', 1)}
            disabled={disabled}
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

