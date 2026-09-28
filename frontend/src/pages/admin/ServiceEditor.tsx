import { type FormEvent } from "react";
import type { ServiceDetail } from "../../api/types";
import FieldEditor from "./FieldEditor";

interface Props {
  editing: ServiceDetail;
  isNew: boolean;
  onChange: (next: ServiceDetail) => void;
  onSave: (e: FormEvent) => void;
  onCancel: () => void;
}

/** Форма создания/редактирования кастомной услуги. */
export default function ServiceEditor({ editing, isNew, onChange, onSave, onCancel }: Props) {
  return (
    <form className="card form" onSubmit={onSave}>
      <h2 className="section-title">{isNew ? "Новая услуга" : "Редактирование"}</h2>

      <div className="field">
        <label className="field-label" htmlFor="svc-id">
          ID (латиницей, напр. smeta)
        </label>
        <input
          id="svc-id"
          className="field-input"
          value={editing.id}
          disabled={!isNew}
          onChange={(e) => onChange({ ...editing, id: e.target.value })}
          required
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="svc-title">
          Название
        </label>
        <input
          id="svc-title"
          className="field-input"
          value={editing.title}
          onChange={(e) => onChange({ ...editing, title: e.target.value })}
          required
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="svc-desc">
          Описание
        </label>
        <textarea
          id="svc-desc"
          className="field-input"
          value={editing.description}
          onChange={(e) => onChange({ ...editing, description: e.target.value })}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="svc-icon">
          Эмодзи-иконка
        </label>
        <input
          id="svc-icon"
          className="field-input"
          value={editing.icon || ""}
          onChange={(e) => onChange({ ...editing, icon: e.target.value })}
        />
      </div>

      <div className="field">
        <label className="field-label">Поля формы</label>
        <div className="admin-field-list">
          {editing.fields.map((f, i) => (
            <FieldEditor
              key={i}
              field={f}
              index={i}
              onChange={(index, patch) => {
                const fields = [...editing.fields];
                fields[index] = { ...fields[index], ...patch };
                onChange({ ...editing, fields });
              }}
              onRemove={(index) => onChange({ ...editing, fields: editing.fields.filter((_, j) => j !== index) })}
            />
          ))}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() =>
              onChange({
                ...editing,
                fields: [...editing.fields, { name: "", label: "", type: "text", required: true }],
              })
            }
          >
            + Поле
          </button>
        </div>
      </div>

      <div className="admin-form-actions">
        <button className="btn btn-primary" type="submit" disabled={!editing.id || !editing.title}>
          Сохранить
        </button>
        <button className="btn btn-ghost" type="button" onClick={onCancel}>
          Отмена
        </button>
      </div>
    </form>
  );
}
