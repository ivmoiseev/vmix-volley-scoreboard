/**
 * Тесты для таймаута в useMatch: состояние и toggleTimeout.
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SET_STATUS } from '../../../src/shared/types/Match';
import type { Match } from '../../../src/shared/types/Match';
import { useMatch } from '../../../src/renderer/hooks/useMatch';

const historyStore = { actions: [] as any[] };

vi.mock('../../../src/shared/services/SetService', () => ({
  SetService: { startSet: vi.fn(), finishSet: vi.fn(), updateSet: vi.fn() },
}));
vi.mock('../../../src/shared/services/ScoreService', () => ({
  ScoreService: { changeScore: vi.fn(), changeServingTeam: vi.fn() },
}));
vi.mock('../../../src/shared/services/HistoryService', () => ({
  HistoryService: {
    addAction: vi.fn((action: any) => { historyStore.actions.push(action); }),
    undoLastAction: vi.fn(() => historyStore.actions.pop() || null),
    getHistorySize: vi.fn(() => historyStore.actions.length),
  },
}));
vi.mock('../../../src/shared/volleyballRules', () => ({
  getRules: vi.fn(() => ({
    isSetball: vi.fn(() => ({ isSetball: false, team: null })),
    isMatchball: vi.fn(() => ({ isMatchball: false, team: null })),
    canFinishSet: vi.fn(() => false),
    getConfig: () => ({ maxSets: 5 }),
  })),
}));
vi.mock('../../../src/shared/matchMigration', () => ({
  migrateMatchToSetStatus: vi.fn((match: Match) => match),
}));

function createTestMatch(overrides: Partial<Match> = {}): Match {
  return {
    matchId: 'test-match',
    variant: 'indoor',
    teamA: { name: 'Команда A', color: '#000' },
    teamB: { name: 'Команда B', color: '#fff' },
    sets: [],
    currentSet: {
      setNumber: 1,
      scoreA: 0,
      scoreB: 0,
      servingTeam: 'A',
      status: SET_STATUS.PENDING,
    },
    statistics: {
      enabled: false,
      teamA: { attack: 0, block: 0, serve: 0, opponentErrors: 0 },
      teamB: { attack: 0, block: 0, serve: 0, opponentErrors: 0 },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Match;
}

describe('useMatch — таймаут', () => {
  beforeEach(() => {
    historyStore.actions = [];
    vi.clearAllMocks();
  });

  it('начальное состояние: таймаут не активен', () => {
    const { result } = renderHook(() => useMatch(createTestMatch()));
    expect(result.current.isTimeoutActive).toBe(false);
    expect(result.current.timeoutTeam).toBeNull();
  });

  it('toggleTimeout("A") включает таймаут для команды A', () => {
    const { result } = renderHook(() => useMatch(createTestMatch()));
    act(() => {
      result.current.toggleTimeout('A');
    });
    expect(result.current.isTimeoutActive).toBe(true);
    expect(result.current.timeoutTeam).toBe('A');
  });

  it('повторный toggleTimeout("A") выключает таймаут', () => {
    const { result } = renderHook(() => useMatch(createTestMatch()));
    act(() => {
      result.current.toggleTimeout('A');
    });
    act(() => {
      result.current.toggleTimeout('A');
    });
    expect(result.current.isTimeoutActive).toBe(false);
    expect(result.current.timeoutTeam).toBeNull();
  });

  it('toggleTimeout("A"), затем toggleTimeout("B") — таймаут активен для команды B', () => {
    const { result } = renderHook(() => useMatch(createTestMatch()));
    act(() => {
      result.current.toggleTimeout('A');
    });
    act(() => {
      result.current.toggleTimeout('B');
    });
    expect(result.current.isTimeoutActive).toBe(true);
    expect(result.current.timeoutTeam).toBe('B');
  });
});
