import { memo } from 'react';

const ScoreDisplay = memo(function ScoreDisplay({ 
  teamA, 
  teamB, 
  scoreA, 
  scoreB, 
  servingTeam,
  isSetball = false,
  setballTeam = null,
  isMatchball = false,
  matchballTeam = null,
  teamALogo = null,
  teamBLogo = null,
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2rem',
      fontSize: '2rem',
      fontWeight: 'bold',
      padding: '1rem',
      position: 'relative',
    }}>
      {/* Логотип команды A */}
      {teamALogo && (
        <div style={{
          width: '120px',
          height: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '0.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <img
            src={teamALogo}
            alt={teamA}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        </div>
      )}
      
      {/* Команда A */}
      <div style={{
        textAlign: 'center',
        color: servingTeam === 'A' ? '#f39c12' : '#34495e',
        position: 'relative',
        minWidth: '150px',
      }}>
        <div>{teamA}</div>
        <div style={{ 
          fontSize: '3rem',
          position: 'relative',
        }}>
          {scoreA}
          {/* Индикатор сетбола/матчбола для команды A */}
          {(isMatchball && matchballTeam === 'A') || (isSetball && setballTeam === 'A' && !isMatchball) ? (
            <div style={{
              position: 'absolute',
              top: '-10px',
              right: '-20px',
              padding: '0.25rem 0.5rem',
              backgroundColor: isMatchball ? '#e74c3c' : '#f39c12',
              color: 'white',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              zIndex: 10,
            }}>
              {isMatchball ? 'МАТЧБОЛ' : 'СЕТБОЛ'}
            </div>
          ) : null}
        </div>
      </div>
      
      <div style={{ fontSize: '2rem' }}>:</div>
      
      {/* Команда B */}
      <div style={{
        textAlign: 'center',
        color: servingTeam === 'B' ? '#f39c12' : '#34495e',
        position: 'relative',
        minWidth: '150px',
      }}>
        <div>{teamB}</div>
        <div style={{ 
          fontSize: '3rem',
          position: 'relative',
        }}>
          {scoreB}
          {/* Индикатор сетбола/матчбола для команды B */}
          {(isMatchball && matchballTeam === 'B') || (isSetball && setballTeam === 'B' && !isMatchball) ? (
            <div style={{
              position: 'absolute',
              top: '-10px',
              left: '-20px',
              padding: '0.25rem 0.5rem',
              backgroundColor: isMatchball ? '#e74c3c' : '#f39c12',
              color: 'white',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              zIndex: 10,
            }}>
              {isMatchball ? 'МАТЧБОЛ' : 'СЕТБОЛ'}
            </div>
          ) : null}
        </div>
      </div>
      
      {/* Логотип команды B */}
      {teamBLogo && (
        <div style={{
          width: '120px',
          height: '120px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '0.5rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <img
            src={teamBLogo}
            alt={teamB}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
          />
        </div>
      )}
    </div>
  );
});

export default ScoreDisplay;

