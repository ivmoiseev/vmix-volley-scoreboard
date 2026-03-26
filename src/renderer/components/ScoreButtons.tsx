import type { CSSProperties } from 'react';
import { space } from '../theme/tokens';
import Button from './Button';

export interface ScoreButtonsProps {
  teamAName: string;
  teamBName: string;
  onScoreChange: (team: 'A' | 'B', delta: number) => void;
  disabled?: boolean;
  /** Toggle таймаута для команды (опционально) */
  onTimeoutClick?: (team: 'A' | 'B') => void;
  timeoutTeam?: 'A' | 'B' | null;
  isTimeoutActive?: boolean;
}

export default function ScoreButtons({
  teamAName,
  teamBName,
  onScoreChange,
  disabled = false,
  onTimeoutClick,
  timeoutTeam,
  isTimeoutActive,
}: ScoreButtonsProps) {
  const sizeStyle: CSSProperties = {
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
        {onTimeoutClick && (
          <div style={{ marginTop: space.sm }}>
            <Button
              type="button"
              variant={isTimeoutActive && timeoutTeam === 'A' ? 'primary' : 'secondary'}
              onClick={() => onTimeoutClick('A')}
            >
              Таймаут
            </Button>
          </div>
        )}
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
        {onTimeoutClick && (
          <div style={{ marginTop: space.sm }}>
            <Button
              type="button"
              variant={isTimeoutActive && timeoutTeam === 'B' ? 'primary' : 'secondary'}
              onClick={() => onTimeoutClick('B')}
            >
              Таймаут
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
