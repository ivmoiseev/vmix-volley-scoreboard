import React, { useState, useEffect, useCallback } from "react";
import type { DataMapGroup } from "../../shared/dataMapCatalog";
import { getDataMapCatalog } from "../../shared/dataMapCatalog";
import { space, radius, typography } from "../theme/tokens";
import {
  type MassMappingKind,
  type MassMappingMode,
  type MassMappingScope,
  type MassMappingSide,
  type MassMappingAssignment,
  buildMassMappingPreview,
  applyMassMapping,
} from "../utils/vmixMassMapping";

const panelStyle = {
  marginTop: space.md,
  paddingTop: space.md,
  borderTop: "1px solid var(--color-surface-muted)",
};

const blockHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: `${space.sm} 0.75rem`,
  backgroundColor: "var(--color-surface-muted)",
  color: "var(--color-text)",
  border: "1px solid var(--color-border)",
  borderRadius: radius.sm,
  cursor: "pointer",
  marginBottom: space.xs,
};

const blockBodyStyle = {
  padding: "0.75rem",
  backgroundColor: "var(--color-surface)",
  color: "var(--color-text)",
  border: "1px solid var(--color-border)",
  borderTop: "none",
  borderRadius: `0 0 ${radius.sm} ${radius.sm}`,
  marginBottom: space.sm,
};

interface CatalogOption {
  key: string;
  label: string;
}

function flattenCatalogOptions(catalogGroups: DataMapGroup[] | null | undefined): CatalogOption[] {
  const options: CatalogOption[] = [];
  (catalogGroups || []).forEach((group) => {
    (group.items || []).forEach((item) => {
      options.push({ key: item.key, label: item.label });
    });
  });
  return options;
}

export interface VMixInputConfig {
  vmixNumber?: string;
  vmixTitle?: string;
  [key: string]: unknown;
}

export interface VMixInputFieldsPanelProps {
  inputId: string;
  inputConfig: VMixInputConfig | null | undefined;
  config: { inputs?: Record<string, { fields?: Record<string, unknown> }> } | null | undefined;
  onFieldChange?: (inputId: string, fieldName: string, value: { dataMapKey?: string; customValue?: string; vmixFieldType?: string } | null) => void;
  readOnly?: boolean;
}

function VMixInputFieldsPanel({
  inputId,
  inputConfig,
  config,
  onFieldChange,
  readOnly = false,
}: VMixInputFieldsPanelProps) {
  const [fields, setFields] = useState<{ name: string; type: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedNames, setExpandedNames] = useState<Set<string>>(new Set());

  // --- Mass mapping (Rosters/Lineup) ---
  const [showMassMapping, setShowMassMapping] = useState(false);
  const [massSide, setMassSide] = useState<MassMappingSide>("A");
  const [massScope, setMassScope] = useState<MassMappingScope>("roster");
  const [massMode, setMassMode] = useState<MassMappingMode>("onlyEmpty");
  const [massPlayerFrom, setMassPlayerFrom] = useState(1);
  const [massPlayerTo, setMassPlayerTo] = useState(14);
  const [massKinds, setMassKinds] = useState<Record<MassMappingKind, boolean>>({
    Number: true,
    Name: true,
    Position: false,
    PositionShort: false,
  });
  const [massFieldSearch, setMassFieldSearch] = useState("");
  const [massAssignments, setMassAssignments] = useState<Record<string, string>>({});
  const [massPreviewEnabledByField, setMassPreviewEnabledByField] = useState<Record<string, boolean>>({});

  const vmixNumber = inputConfig?.vmixNumber ?? inputConfig?.vmixTitle;
  const currentFields = config?.inputs?.[inputId]?.fields || {};
  const fieldTypeByName = fields.reduce<Record<string, string>>((acc, f) => {
    const t = f.type === "color" ? "color" : f.type;
    acc[f.name] = t;
    return acc;
  }, {});

  const fetchFields = useCallback(async () => {
    if (!window.electronAPI?.getVMixInputFields || !vmixNumber) {
      setFields([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.getVMixInputFields(vmixNumber, false);
      if (result?.success && Array.isArray(result.fields)) {
        setFields(result.fields);
      } else {
        setFields([]);
        if (result?.error) setError(result.error);
      }
    } catch (e) {
      setError((e instanceof Error ? e.message : null) || "Ошибка загрузки полей");
      setFields([]);
    } finally {
      setLoading(false);
    }
  }, [vmixNumber]);

  useEffect(() => {
    if (!inputId || !inputConfig) {
      setFields([]);
      return;
    }
    fetchFields();
  }, [inputId, inputConfig?.vmixNumber, inputConfig?.vmixTitle, fetchFields]);

  const toggleExpanded = (name: string) => {
    setExpandedNames((prev) => {
      if (prev.has(name)) return new Set();
      return new Set([name]);
    });
  };

  const handleSetMapping = (fieldName: string, vmixFieldType: string, value: { dataMapKey?: string; customValue?: string } | null) => {
    if (readOnly || !onFieldChange) return;
    if (value == null) {
      onFieldChange(inputId, fieldName, null);
      return;
    }
    if (value.dataMapKey === "" && (value.customValue == null || value.customValue === "")) {
      onFieldChange(inputId, fieldName, null);
      return;
    }
    const toStore = { vmixFieldType };
    if (value.dataMapKey != null && value.dataMapKey !== "") toStore.dataMapKey = value.dataMapKey;
    if (value.customValue !== undefined) toStore.customValue = value.customValue;
    const hasMapping = "dataMapKey" in toStore || "customValue" in toStore;
    onFieldChange(inputId, fieldName, hasMapping ? toStore : null);
  };

  if (loading) {
    return (
      <div style={panelStyle}>
        <p style={{ color: 'var(--color-text-secondary)' }}>Загрузка полей инпута…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={panelStyle}>
        <p style={{ color: "var(--color-danger)" }}>{error}</p>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div style={panelStyle}>
        <p style={{ color: "var(--color-text-secondary)" }}>Нет полей или инпут недоступен.</p>
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <h5 style={{ margin: 0, color: "var(--color-text)" }}>Поля инпута</h5>
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              // reset defaults on open based on scope
              setMassScope("roster");
              setMassSide("A");
              setMassMode("onlyEmpty");
              setMassPlayerFrom(1);
              setMassPlayerTo(14);
              setMassKinds({ Number: true, Name: true, Position: false, PositionShort: false });
              setMassFieldSearch("");
              setMassAssignments({});
              setMassPreviewEnabledByField({});
              setShowMassMapping(true);
            }}
            style={{
              padding: "0.4rem 0.6rem",
              borderRadius: radius.sm,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              cursor: "pointer",
              fontSize: typography.small,
            }}
          >
            Массовое сопоставление…
          </button>
        )}
      </div>

      {showMassMapping && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "var(--color-overlay)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowMassMapping(false)}
        >
          <div
            style={{
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text)",
              padding: space.lg,
              borderRadius: radius.md,
              width: "min(1100px, 95vw)",
              maxHeight: "90vh",
              overflow: "auto",
              border: "1px solid var(--color-border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Массовое сопоставление Rosters/Lineup</h3>

            <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Набор</label>
                  <select
                    value={`${massScope}:${massSide}`}
                    onChange={(e) => {
                      const [scope, side] = String(e.target.value).split(":");
                      setMassScope(scope as MassMappingScope);
                      setMassSide(side as MassMappingSide);
                      // Update default range for lineup
                      if (scope === "starting") {
                        setMassPlayerFrom(1);
                        setMassPlayerTo(6);
                      } else {
                        setMassPlayerFrom(1);
                        setMassPlayerTo(14);
                      }
                    }}
                    style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--color-border)", borderRadius: radius.sm }}
                  >
                    <option value="roster:A">Roster A</option>
                    <option value="roster:B">Roster B</option>
                    <option value="starting:A">Lineup A</option>
                    <option value="starting:B">Lineup B</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Режим</label>
                  <select
                    value={massMode}
                    onChange={(e) => setMassMode(e.target.value as MassMappingMode)}
                    style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--color-border)", borderRadius: radius.sm }}
                  >
                    <option value="onlyEmpty">Применить только пустые</option>
                    <option value="overwrite">Перезаписать существующие</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Поиск по полям vMix</label>
                  <input
                    type="text"
                    value={massFieldSearch}
                    onChange={(e) => setMassFieldSearch(e.target.value)}
                    placeholder="Например: Name, #, Player, 1"
                    style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--color-border)", borderRadius: radius.sm }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: "0.75rem", alignItems: "end" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Игроки</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      type="number"
                      value={massPlayerFrom}
                      min={1}
                      max={massScope === "starting" ? 6 : 14}
                      onChange={(e) => setMassPlayerFrom(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--color-border)", borderRadius: radius.sm }}
                    />
                    <span style={{ alignSelf: "center", color: "var(--color-text-secondary)" }}>…</span>
                    <input
                      type="number"
                      value={massPlayerTo}
                      min={1}
                      max={massScope === "starting" ? 6 : 14}
                      onChange={(e) => setMassPlayerTo(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      style={{ width: "100%", padding: "0.5rem", border: "1px solid var(--color-border)", borderRadius: radius.sm }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold" }}>Колонки</label>
                  <div style={{ display: "grid", gap: "0.25rem" }}>
                    {(Object.keys(massKinds) as MassMappingKind[]).map((k) => (
                      <label key={k} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <input
                          type="checkbox"
                          checked={massKinds[k]}
                          onChange={(e) => setMassKinds((prev) => ({ ...prev, [k]: e.target.checked }))}
                        />
                        {k === "Number"
                          ? "Number"
                          : k === "Name"
                            ? "Name"
                            : k === "Position"
                              ? "Position (полное)"
                              : "PositionShort"}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ color: "var(--color-text-secondary)", fontSize: typography.small }}>
                  Подсказка: здесь вы выбираете реальные поля текущего GT-инпута vMix. Никаких “хардкодных” имён — это работает в любом проекте.
                </div>
              </div>
            </div>

            {(() => {
              const from = Math.min(massPlayerFrom, massPlayerTo);
              const to = Math.max(massPlayerFrom, massPlayerTo);
              const playerIndexes = Array.from({ length: to - from + 1 }, (_, i) => from + i);
              const enabledKinds = (Object.keys(massKinds) as MassMappingKind[]).filter((k) => massKinds[k]);
              const filteredFields = fields.filter((f) =>
                massFieldSearch.trim()
                  ? f.name.toLowerCase().includes(massFieldSearch.trim().toLowerCase())
                  : true
              );

              const cellKey = (pi: number, kind: MassMappingKind) => `${pi}:${kind}`;
              const buildAssignments = (): MassMappingAssignment[] => {
                const out: MassMappingAssignment[] = [];
                for (const pi of playerIndexes) {
                  for (const kind of enabledKinds) {
                    const chosen = massAssignments[cellKey(pi, kind)];
                    if (!chosen) continue;
                    out.push({
                      vmixFieldName: chosen,
                      vmixFieldType: fieldTypeByName[chosen] ?? "text",
                      target: { side: massSide, scope: massScope, playerIndex: pi, kind },
                    });
                  }
                }
                return out;
              };

              const assignments = buildAssignments();
              const vmixFieldCounts = assignments.reduce<Record<string, number>>((acc, a) => {
                acc[a.vmixFieldName] = (acc[a.vmixFieldName] ?? 0) + 1;
                return acc;
              }, {});
              const duplicateVMixFields = Object.entries(vmixFieldCounts)
                .filter(([, c]) => c > 1)
                .map(([name]) => name);

              const rawPreviewRows = buildMassMappingPreview({
                assignments: buildAssignments(),
                currentFieldsMapping: currentFields as any,
                mode: massMode,
              });

              const previewRows = rawPreviewRows.map((r) => ({
                ...r,
                enabled: massPreviewEnabledByField[r.vmixFieldName] ?? true,
              }));
              const enabledPreviewRows = previewRows.filter((r) => r.enabled);

              return (
                <>
                  <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: radius.sm }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                      <thead>
                        <tr style={{ background: "var(--color-surface-muted)" }}>
                          <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid var(--color-border)" }}>Player</th>
                          {enabledKinds.map((k) => (
                            <th key={k} style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid var(--color-border)" }}>
                              {k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {playerIndexes.map((pi) => (
                          <tr key={pi}>
                            <td style={{ padding: "0.5rem", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>
                              Player {pi}
                            </td>
                            {enabledKinds.map((kind) => (
                              <td key={kind} style={{ padding: "0.5rem", borderBottom: "1px solid var(--color-border)" }}>
                                <select
                                  aria-label={`Player ${pi} ${kind}`}
                                  value={massAssignments[cellKey(pi, kind)] ?? ""}
                                  onChange={(e) =>
                                    setMassAssignments((prev) => ({
                                      ...prev,
                                      [cellKey(pi, kind)]: e.target.value,
                                    }))
                                  }
                                  style={{ width: "100%", padding: "0.4rem", border: "1px solid var(--color-border)", borderRadius: radius.sm }}
                                >
                                  <option value="">— не выбрано —</option>
                                  {filteredFields.map((f) => (
                                    <option key={f.name} value={f.name}>
                                      {f.name}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {duplicateVMixFields.length > 0 && (
                    <div style={{ marginTop: "0.75rem", padding: "0.75rem", borderRadius: radius.sm, border: "1px solid var(--color-warning)", background: "var(--color-surface-muted)" }}>
                      <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>Внимание: одно и то же поле vMix выбрано несколько раз</div>
                      <div style={{ fontSize: typography.small, color: "var(--color-text-secondary)" }}>
                        Это не ошибка, но при применении для каждого такого поля останется только одно сопоставление (последний выбранный “слот”).
                        Если так задумано — игнорируйте. Если нет — исправьте назначения в таблице.
                      </div>
                      <div style={{ marginTop: "0.5rem", fontSize: typography.small }}>
                        {duplicateVMixFields.slice(0, 10).map((name) => (
                          <span key={name} style={{ display: "inline-block", marginRight: "0.5rem" }}>
                            <code>{name}</code>
                          </span>
                        ))}
                        {duplicateVMixFields.length > 10 && (
                          <span style={{ color: "var(--color-text-secondary)" }}>… и ещё {duplicateVMixFields.length - 10}</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: "1rem" }}>
                    <h4 style={{ margin: "0 0 0.5rem 0" }}>Предпросмотр изменений</h4>
                    {previewRows.length === 0 ? (
                      <div style={{ color: "var(--color-text-secondary)", fontSize: typography.small }}>
                        Нет изменений. Выберите поля vMix в таблице выше.
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: "0.4rem" }}>
                        {previewRows.map((r) => (
                          <label key={`${r.vmixFieldName}:${r.dataMapKey}`} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <input
                              type="checkbox"
                              checked={r.enabled}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setMassPreviewEnabledByField((prev) => ({ ...prev, [r.vmixFieldName]: checked }));
                              }}
                            />
                            <span style={{ fontSize: typography.small }}>
                              <strong>{r.vmixFieldName}</strong> → <code>{r.dataMapKey}</code>
                              {r.willOverwrite && (
                                <span style={{ marginLeft: "0.5rem", color: "var(--color-danger)" }}>
                                  (перезапись)
                                </span>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1.25rem" }}>
                    <button
                      type="button"
                      onClick={() => setShowMassMapping(false)}
                      style={{
                        padding: "0.5rem 0.75rem",
                        borderRadius: radius.sm,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface)",
                        color: "var(--color-text)",
                        cursor: "pointer",
                      }}
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!onFieldChange) return;
                        applyMassMapping({
                          inputId,
                          onFieldChange,
                          previewRows: enabledPreviewRows,
                        });
                        setShowMassMapping(false);
                      }}
                      disabled={enabledPreviewRows.length === 0}
                      style={{
                        padding: "0.5rem 0.75rem",
                        borderRadius: radius.sm,
                        border: "1px solid var(--color-border)",
                        background: enabledPreviewRows.length === 0 ? "var(--color-surface-muted)" : "var(--color-success)",
                        color: enabledPreviewRows.length === 0 ? "var(--color-text-secondary)" : "white",
                        cursor: enabledPreviewRows.length === 0 ? "not-allowed" : "pointer",
                        fontWeight: 700,
                      }}
                    >
                      Применить ({enabledPreviewRows.length})
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {fields.map((field) => {
        const fieldMapping = currentFields[field.name];
        const isExpanded = expandedNames.has(field.name);
        const type = field.type === "color" ? "color" : field.type;

        const preview =
          fieldMapping?.customValue != null
            ? `Произвольный текст: ${String(fieldMapping.customValue).slice(0, 30)}${(fieldMapping.customValue || "").length > 30 ? "…" : ""}`
            : fieldMapping?.dataMapKey
              ? getDataMapLabel(fieldMapping.dataMapKey, type)
              : null;

        return (
          <div key={field.name}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleExpanded(field.name)}
              onKeyDown={(e) => e.key === "Enter" && toggleExpanded(field.name)}
              style={blockHeaderStyle}
            >
              <span style={{ fontWeight: 500 }}>
                {field.name}
                {preview && (
                  <span style={{ marginLeft: "0.5rem", color: "var(--color-success)", fontSize: typography.small }}>
                    — {preview}
                  </span>
                )}
              </span>
              <span style={{ fontSize: "0.875rem" }}>{isExpanded ? "▼" : "▶"}</span>
            </div>
            {isExpanded && (
              <div style={blockBodyStyle}>
                <FieldBlockContent
                  field={field}
                  fieldMapping={fieldMapping}
                  readOnly={readOnly}
                  onSetMapping={(value) => handleSetMapping(field.name, type, value)}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getDataMapLabel(dataMapKey: string, fieldType: string): string {
  const catalog = getDataMapCatalog({ fieldType: (fieldType === "text" ? "text" : fieldType) as "text" | "color" | "image" });
  for (const group of catalog) {
    const item = (group.items || []).find((i) => i.key === dataMapKey);
    if (item) return item.label;
  }
  return dataMapKey;
}

interface FieldBlockContentProps {
  field: { name: string; type: string };
  fieldMapping: { dataMapKey?: string; customValue?: string } | undefined;
  readOnly: boolean;
  onSetMapping: (value: { dataMapKey?: string; customValue?: string } | null) => void;
}

function FieldBlockContent({
  field,
  fieldMapping,
  readOnly,
  onSetMapping,
}: FieldBlockContentProps) {
  const type = field.type === "color" ? "color" : field.type;
  const catalog = getDataMapCatalog({ fieldType: (type === "text" ? "text" : type) as "text" | "color" | "image" });
  const options = flattenCatalogOptions(catalog);

  const isCustomText = type === "text" && fieldMapping && "customValue" in fieldMapping;
  const [localCustomText, setLocalCustomText] = useState(
    typeof fieldMapping?.customValue === "string" ? fieldMapping.customValue : ""
  );

  const handleDataMapSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value;
    onSetMapping(key ? { dataMapKey: key } : { dataMapKey: "" });
  };

  const handleCustomTextToggle = () => {
    if (isCustomText) {
      onSetMapping({ dataMapKey: "" });
    } else {
      onSetMapping({ customValue: localCustomText || "" });
    }
  };

  const handleCustomTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setLocalCustomText(v);
    onSetMapping({ customValue: v });
  };

  if (readOnly) {
    return (
      <div style={{ fontSize: typography.small, color: "var(--color-text-secondary)" }}>
        {fieldMapping?.dataMapKey && (
          <p>Данные приложения: {getDataMapLabel(fieldMapping.dataMapKey, type)}</p>
        )}
        {fieldMapping?.customValue != null && fieldMapping?.customValue !== "" && (
          <p>Произвольный текст: {fieldMapping.customValue}</p>
        )}
        {!fieldMapping?.dataMapKey && fieldMapping?.customValue == null && (
          <p>Не сопоставлено</p>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "0.75rem" }}>
      {type === "text" && (
        <>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-text)" }}>
            <input
              type="checkbox"
              checked={!!isCustomText}
              onChange={handleCustomTextToggle}
            />
            <span>Произвольный текст</span>
          </label>
          {isCustomText ? (
            <input
              type="text"
              value={localCustomText}
              onChange={handleCustomTextChange}
              placeholder="Введите текст"
              style={{ padding: space.sm, border: "1px solid var(--color-border)", borderRadius: radius.sm }}
            />
          ) : (
            <div>
              <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold", color: "var(--color-text)" }}>
                Данные приложения
              </label>
              <select
                value={fieldMapping?.dataMapKey ?? ""}
                onChange={handleDataMapSelect}
                style={{ width: "100%", padding: space.sm, border: "1px solid var(--color-border)", borderRadius: radius.sm }}
              >
                <option value="">— Не сопоставлено —</option>
                {options.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </>
      )}
      {(type === "color" || type === "image") && (
        <div>
          <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: "bold", color: "var(--color-text)" }}>
            Данные приложения
          </label>
          <select
            value={fieldMapping?.dataMapKey ?? ""}
            onChange={handleDataMapSelect}
            style={{ width: "100%", padding: space.sm, border: "1px solid var(--color-border)", borderRadius: radius.sm }}
          >
            <option value="">— Не сопоставлено —</option>
            {options.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export default VMixInputFieldsPanel;
