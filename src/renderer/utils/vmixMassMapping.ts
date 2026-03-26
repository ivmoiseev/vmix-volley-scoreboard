export type MassMappingMode = 'onlyEmpty' | 'overwrite';

export type MassMappingKind = 'Number' | 'Name' | 'Position' | 'PositionShort';

export type MassMappingScope = 'roster' | 'starting';

export type MassMappingSide = 'A' | 'B';

export type MassMappingTarget = {
  side: MassMappingSide;
  scope: MassMappingScope;
  playerIndex: number; // 1-based
  kind: MassMappingKind;
};

export type MassMappingAssignment = {
  vmixFieldName: string;
  vmixFieldType: string; // text/color/image/visibility...
  target: MassMappingTarget;
};

export type MassMappingPreviewRow = {
  vmixFieldName: string;
  vmixFieldType: string;
  dataMapKey: string;
  willOverwrite: boolean;
  enabled: boolean;
};

export function targetToDataMapKey(target: MassMappingTarget): string {
  const { side, scope, playerIndex, kind } = target;
  if (!['A', 'B'].includes(side)) throw new Error(`Некорректная сторона: ${String(side)}`);
  if (!['roster', 'starting'].includes(scope)) throw new Error(`Некорректный scope: ${String(scope)}`);
  if (!Number.isInteger(playerIndex) || playerIndex < 1) throw new Error(`Некорректный playerIndex: ${String(playerIndex)}`);

  const prefix = scope === 'roster' ? `roster${side}` : `starting${side}`;
  const suffix =
    kind === 'Number'
      ? 'Number'
      : kind === 'Name'
        ? 'Name'
        : kind === 'Position'
          ? 'Position'
          : kind === 'PositionShort'
            ? 'PositionShort'
            : null;
  if (!suffix) throw new Error(`Некорректный kind: ${String(kind)}`);
  return `${prefix}.player${playerIndex}${suffix}`;
}

export function buildMassMappingPreview(args: {
  assignments: MassMappingAssignment[];
  currentFieldsMapping: Record<string, unknown> | null | undefined;
  mode: MassMappingMode;
}): MassMappingPreviewRow[] {
  const { assignments, currentFieldsMapping, mode } = args;
  const current = currentFieldsMapping ?? {};
  const rows: MassMappingPreviewRow[] = [];

  for (const a of assignments) {
    if (!a?.vmixFieldName) continue;
    const existing = (current as any)[a.vmixFieldName];
    const hasExisting = existing != null && (typeof existing === 'object' ? Object.keys(existing).length > 0 : true);
    const willOverwrite = hasExisting;
    if (mode === 'onlyEmpty' && willOverwrite) {
      continue;
    }
    rows.push({
      vmixFieldName: a.vmixFieldName,
      vmixFieldType: a.vmixFieldType,
      dataMapKey: targetToDataMapKey(a.target),
      willOverwrite,
      enabled: true,
    });
  }

  // Дедуп по имени поля vMix: если одно поле выбрали несколько раз — оставляем последний выбор
  const byName = new Map<string, MassMappingPreviewRow>();
  for (const r of rows) byName.set(r.vmixFieldName, r);
  return Array.from(byName.values());
}

export function applyMassMapping(args: {
  inputId: string;
  previewRows: MassMappingPreviewRow[];
  onFieldChange: (inputId: string, fieldName: string, value: { dataMapKey?: string; customValue?: string; vmixFieldType?: string } | null) => void;
}): void {
  const { inputId, previewRows, onFieldChange } = args;
  for (const row of previewRows) {
    if (!row.enabled) continue;
    onFieldChange(inputId, row.vmixFieldName, {
      dataMapKey: row.dataMapKey,
      vmixFieldType: row.vmixFieldType,
    });
  }
}

