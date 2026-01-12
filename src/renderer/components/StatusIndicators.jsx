import { memo } from 'react';

const StatusIndicators = memo(function StatusIndicators({ isSetball, isMatchball }) {
  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      justifyContent: 'center',
      marginBottom: '1rem',
    }}>
      {isSetball && (
        <div style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#f39c12',
          color: 'white',
          borderRadius: '4px',
          fontWeight: 'bold',
        }}>
          СЕТБОЛ
        </div>
      )}
      {isMatchball && (
        <div style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#e74c3c',
          color: 'white',
          borderRadius: '4px',
          fontWeight: 'bold',
        }}>
          МАТЧБОЛ
        </div>
      )}
    </div>
  );
});

export default StatusIndicators;

