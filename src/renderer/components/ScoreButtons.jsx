import { space, radius } from '../theme/tokens';
import Button from './Button';

function ScoreButtons({ teamAName, teamBName, onScoreChange, disabled = false }) {
  const sizeStyle = {
    padding: `${space.md} ${space.xl}`,
    fontSize: '1.5rem',
    fontWeight: 'bold',
    minWidth: '120px',
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: space.md,
      marginBottom: space.md,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: space.sm, fontWeight: 'bold' }}>{teamAName}</div>
        <div style={{ display: 'flex', gap: space.sm, justifyContent: 'center' }}>
          <Button
            variant="danger"
            disabled={disabled}
            onClick={() => !disabled && onScoreChange('A', -1)}
            style={sizeStyle}
          >
            -1
          </Button>
          <Button
            variant="success"
            disabled={disabled}
            onClick={() => !disabled && onScoreChange('A', 1)}
            style={sizeStyle}
          >
            +1
          </Button>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: space.sm, fontWeight: 'bold' }}>{teamBName}</div>
        <div style={{ display: 'flex', gap: space.sm, justifyContent: 'center' }}>
          <Button
            variant="danger"
            disabled={disabled}
            onClick={() => !disabled && onScoreChange('B', -1)}
            style={sizeStyle}
          >
            -1
          </Button>
          <Button
            variant="success"
            disabled={disabled}
            onClick={() => !disabled && onScoreChange('B', 1)}
            style={sizeStyle}
          >
            +1
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ScoreButtons;

