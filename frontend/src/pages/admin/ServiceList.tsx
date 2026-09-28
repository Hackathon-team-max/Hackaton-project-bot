import type { Service } from "../../api/types";

interface Props {
  services: Service[];
  customIds: Set<string>;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}

/** Список услуг каталога: кастомные редактируются, из API — read-only. */
export default function ServiceList({ services, customIds, onEdit, onRemove }: Props) {
  return (
    <div className="list">
      {services.map((s) => (
        <div key={s.id} className="card service-card">
          <div className="service-icon">{s.icon || "📋"}</div>
          <div className="service-body">
            <div className="service-title">{s.title}</div>
            <div className="service-desc">
              {s.description} · <code>/{s.id}</code>
              {customIds.has(s.id) ? " · добавлено в админке" : " · из каталога"}
            </div>
          </div>
          {customIds.has(s.id) ? (
            <div className="admin-row-actions">
              <button type="button" className="btn btn-ghost" onClick={() => onEdit(s.id)}>
                Изменить
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => onRemove(s.id)}>
                Удалить
              </button>
            </div>
          ) : (
            <span className="pill run">только чтение</span>
          )}
        </div>
      ))}
      {services.length === 0 && <div className="muted">Услуг пока нет</div>}
    </div>
  );
}
