import React, { useState, useEffect, useCallback } from "react";
import { getDataMapCatalog } from "../../shared/dataMapCatalog";
import { space, radius, typography } from "../theme/tokens";

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

/**
 * Собирает плоский список опций { key, label } из иерархического справочника
 */
function flattenCatalogOptions(catalogGroups) {
  const options = [];
  (catalogGroups || []).forEach((group) => {
    (group.items || []).forEach((item) => {
      options.push({ key: item.key, label: item.label });
    });
  });
  return options;
}

function VMixInputFieldsPanel({
  inputId,
  inputConfig,
  config,
  onFieldChange,
  readOnly = false,
}) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedNames, setExpandedNames] = useState(new Set());

  const vmixNumber = inputConfig?.vmixNumber ?? inputConfig?.vmixTitle;
  const currentFields = config?.inputs?.[inputId]?.fields || {};

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
      setError(e?.message || "Ошибка загрузки полей");
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

  const toggleExpanded = (name) => {
    setExpandedNames((prev) => {
      if (prev.has(name)) return new Set();
      return new Set([name]);
    });
  };

  const handleSetMapping = (fieldName, vmixFieldType, value) => {
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
      <h5 style={{ marginTop: 0, marginBottom: "0.75rem", color: "var(--color-text)" }}>Поля инпута</h5>
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

function getDataMapLabel(dataMapKey, fieldType) {
  const catalog = getDataMapCatalog({ fieldType: fieldType === "text" ? "text" : fieldType });
  for (const group of catalog) {
    const item = (group.items || []).find((i) => i.key === dataMapKey);
    if (item) return item.label;
  }
  return dataMapKey;
}

function FieldBlockContent({
  field,
  fieldMapping,
  readOnly,
  onSetMapping,
}) {
  const type = field.type === "color" ? "color" : field.type;
  const catalog = getDataMapCatalog({ fieldType: type === "text" ? "text" : type });
  const options = flattenCatalogOptions(catalog);

  const isCustomText = type === "text" && fieldMapping && "customValue" in fieldMapping;
  const [localCustomText, setLocalCustomText] = useState(
    typeof fieldMapping?.customValue === "string" ? fieldMapping.customValue : ""
  );

  const handleDataMapSelect = (e) => {
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

  const handleCustomTextChange = (e) => {
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
