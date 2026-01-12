
function ServeControl({ servingTeam, teamAName, teamBName, onChange }) {
  const servingTeamName = servingTeam === 'A' ? teamAName : teamBName;
  
  // Левая стрелка (◄) передает подачу команде A
  // Если уже подает A, кнопка неактивна
  const isLeftDisabled = servingTeam === 'A';
  
  // Правая стрелка (►) передает подачу команде B
  // Если уже подает B, кнопка неактивна
  const isRightDisabled = servingTeam === 'B';

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
      <span style={{ fontWeight: 'bold', color: '#f39c12' }}>{servingTeamName}</span>
      <button
        onClick={() => !isLeftDisabled && onChange('A')}
        disabled={isLeftDisabled}
        style={{
          padding: '0.25rem 0.5rem',
          fontSize: '1rem',
          backgroundColor: isLeftDisabled ? '#bdc3c7' : '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLeftDisabled ? 'not-allowed' : 'pointer',
          opacity: isLeftDisabled ? 0.5 : 1,
        }}
        title={isLeftDisabled ? 'Команда A уже подает' : 'Передать подачу команде A'}
      >
        ◄
      </button>
      <button
        onClick={() => !isRightDisabled && onChange('B')}
        disabled={isRightDisabled}
        style={{
          padding: '0.25rem 0.5rem',
          fontSize: '1rem',
          backgroundColor: isRightDisabled ? '#bdc3c7' : '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isRightDisabled ? 'not-allowed' : 'pointer',
          opacity: isRightDisabled ? 0.5 : 1,
        }}
        title={isRightDisabled ? 'Команда B уже подает' : 'Передать подачу команде B'}
      >
        ►
      </button>
    </div>
  );
}

export default ServeControl;

