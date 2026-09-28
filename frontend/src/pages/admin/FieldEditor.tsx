import type { FieldSchema } from "../../api/types";

interface Props {
  field: FieldSchema;
  index: number;
  onChange: (index: number, patch: Partial<FieldSchema>) => void;
  onRemove: (index: number) => void;
}

/** Редактор одной строки поля формы услуги (внутри ServiceEditor). */
export default function FieldEditor({ field: f, index: i, onChange, onRemove }: Props) {
  return (
    <div className="admin-field-row">
      <input
        className="admin-field-input"
        placeholder="name (ключ)"
        value={f.name}
        onChange={(e) => onChange(i, { name: e.target.value })}
      />
      <input
        className="admin-field-input"
        placeholder="Название поля"
        value={f.label}
        onChange={(e) => onChange(i, { label: e.target.value })}
      />
      <select
        className="admin-field-input"
        value={f.type}
        onChange={(e) => onChange(i, { type: e.target.value as FieldSchema["type"] })}
      >
        <option value="text">text</option>
        <option value="tel">tel</option>
        <option value="textarea">textarea</option>
        <option value="select">select</option>
      </select>
      <input
        className="admin-field-input"
        placeholder="Подсказка"
        value={f.placeholder || ""}
        onChange={(e) => onChange(i, { placeholder: e.target.value })}
      />
      {f.type === "select" && (
        <input
          className="admin-field-input"
          placeholder="Варианты через запятую"
          value={(f.options || []).join(", ")}
          onChange={(e) =>
            onChange(i, {
              options: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      )}
      <label className="admin-field-req">
        <input
          type="checkbox"
          checked={!!f.required}
          onChange={(e) => onChange(i, { required: e.target.checked })}
        />
        *
      </label>
      <button type="button" className="btn btn-ghost" onClick={() => onRemove(i)} aria-label="Удалить поле">
        ✕
      </button>
    </div>
  );
}
