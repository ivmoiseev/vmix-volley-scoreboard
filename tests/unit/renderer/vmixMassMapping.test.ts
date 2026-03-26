import { describe, it, expect, vi } from 'vitest';
import {
  targetToDataMapKey,
  buildMassMappingPreview,
  applyMassMapping,
} from '../../../src/renderer/utils/vmixMassMapping';

describe('vmixMassMapping', () => {
  it('targetToDataMapKey: rosterA player7 name', () => {
    expect(
      targetToDataMapKey({ side: 'A', scope: 'roster', playerIndex: 7, kind: 'Name' })
    ).toBe('rosterA.player7Name');
  });

  it('targetToDataMapKey: startingB player3 position short', () => {
    expect(
      targetToDataMapKey({ side: 'B', scope: 'starting', playerIndex: 3, kind: 'PositionShort' })
    ).toBe('startingB.player3PositionShort');
  });

  it('buildMassMappingPreview: onlyEmpty skips overwrites', () => {
    const rows = buildMassMappingPreview({
      mode: 'onlyEmpty',
      currentFieldsMapping: { Field1: { dataMapKey: 'teamA.name' } },
      assignments: [
        {
          vmixFieldName: 'Field1',
          vmixFieldType: 'text',
          target: { side: 'A', scope: 'roster', playerIndex: 1, kind: 'Name' },
        },
        {
          vmixFieldName: 'Field2',
          vmixFieldType: 'text',
          target: { side: 'A', scope: 'roster', playerIndex: 2, kind: 'Name' },
        },
      ],
    });
    expect(rows.map((r) => r.vmixFieldName)).toEqual(['Field2']);
  });

  it('buildMassMappingPreview: overwrite includes overwrites and marks willOverwrite', () => {
    const rows = buildMassMappingPreview({
      mode: 'overwrite',
      currentFieldsMapping: { Field1: { dataMapKey: 'teamA.name' } },
      assignments: [
        {
          vmixFieldName: 'Field1',
          vmixFieldType: 'text',
          target: { side: 'A', scope: 'roster', playerIndex: 1, kind: 'Name' },
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].willOverwrite).toBe(true);
  });

  it('applyMassMapping calls onFieldChange for enabled rows', () => {
    const onFieldChange = vi.fn();
    applyMassMapping({
      inputId: 'input-1',
      onFieldChange,
      previewRows: [
        {
          vmixFieldName: 'Field1',
          vmixFieldType: 'text',
          dataMapKey: 'rosterA.player1Name',
          willOverwrite: false,
          enabled: true,
        },
        {
          vmixFieldName: 'Field2',
          vmixFieldType: 'text',
          dataMapKey: 'rosterA.player2Name',
          willOverwrite: false,
          enabled: false,
        },
      ],
    });
    expect(onFieldChange).toHaveBeenCalledTimes(1);
    expect(onFieldChange).toHaveBeenCalledWith('input-1', 'Field1', {
      dataMapKey: 'rosterA.player1Name',
      vmixFieldType: 'text',
    });
  });
});

