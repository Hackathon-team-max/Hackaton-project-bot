import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { isAdminAuthorized, logoutAdmin } from "../../lib/adminAuth";
import { useTheme } from "../../lib/theme";
import {
  getCustomServices,
  upsertCustomService,
  removeCustomService,
} from "../../lib/serviceStore";
import { fetchServices } from "../../api/client";
import type { Service, ServiceDetail, FieldSchema } from "../../api/types";

const emptyDraft = (): ServiceDetail => ({
  id: "",
  title: "",
  description: "",
  icon: "📋",
  steps: [],
  fields: [],
});

export default function AdminPanel() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[] | null>(null);
  const [editing, setEditing] = useState<ServiceDetail | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = () => {
    fetchServices()
      .then(setServices)
      .catch(() => setServices([]));
  };

  useEffect(reload, []);

  if (!isAdminAuthorized()) return <Navigate to="/admin/login" replace state={{ from: "/admin" }} />;

  const customIds = new Set(getCustomServices().map((s) => s.id));

  const startCreate = () => {
    setEditing(emptyDraft());
    setNotice(null);
  };

  const startEdit = (id: string) => {
    const found = getCustomServices().find((s) => s.id === id);
    if (found) {
      setEditing({ ...found });
      setNotice(null);
    }
  };

  const remove = (id: string) => {
    if (!confirm("Удалить услугу из каталога?")) return;
    removeCustomService(id);
    setNotice("Услуга удалена");
    reload();
  };

  const onSave = (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const d = { ...editing, id: editing.id.trim() };
    if (!d.id || !d.title) return;
    upsertCustomService(d);
    setEditing(null);
    setNotice(`Услуга «${d.title}» сохранена`);
    reload();
  };

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1 className="page-title">Админ-панель</h1>
        <div className="admin-actions">
          <button type="button" className="btn btn-ghost" onClick={toggle} aria-label="Переключить тему">
            {theme === "dark" ? "🌙" : "☀️"}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              logoutAdmin();
              navigate("/admin/login", { replace: true });
            }}
          >
            Выйти
          </button>
        </div>
      </div>

      <div className="admin-toolbar">
        <button type="button" className="btn btn-primary" onClick={startCreate}>
          + Добавить услугу
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate("/")}>
          На главную
        </button>
      </div>

      {notice && <div className="admin-notice">{notice}</div>}

      {editing && (
        <form className="card form" onSubmit={onSave}>
          <h2 className="section-title">
            {getCustomServices().some((s) => s.id === editing.id) ? "Редактирование" : "Новая услуга"}
          </h2>

          <div className="field">
            <label className="field-label" htmlFor="svc-id">
              ID (латиница, для ссылки бота)
            </label>
            <input
              id="svc-id"
              value={editing.id}
              onChange={(e) => setEditing({ ...editing, id: e.target.value })}
              placeholder="naprимер: subsidy"
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="svc-title">
              Название
            </label>
            <input
              id="svc-title"
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="svc-desc">
              Описание
            </label>
            <textarea
              id="svc-desc"
              rows={2}
              value={editing.description}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="svc-icon">
              Иконка (эмодзи)
            </label>
            <input
              id="svc-icon"
              value={editing.icon || ""}
              onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="svc-steps">
              Шаги (по одному в строке)
            </label>
            <textarea
              id="svc-steps"
              rows={3}
              value={editing.steps.join("\n")}
              onChange={(e) =>
                setEditing({ ...editing, steps: e.target.value.split("\n").filter(Boolean) })
              }
            />
          </div>

          <div className="field">
            <div className="field-label">Поля формы</div>
            {editing.fields.map((f, i) => (
              <div key={i} className="admin-field-row">
                <input
                  placeholder="name (latin)"
                  value={f.name}
                  onChange={(e) => {
                    const fields = [...editing.fields];
                    fields[i] = { ...f, name: e.target.value };
                    setEditing({ ...editing, fields });
                  }}
                />
                <input
                  placeholder="Подпись"
                  value={f.label}
                  onChange={(e) => {
                    const fields = [...editing.fields];
                    fields[i] = { ...f, label: e.target.value };
                    setEditing({ ...editing, fields });
                  }}
                />
                <select
                  value={f.type}
                  onChange={(e) => {
                    const fields = [...editing.fields];
                    fields[i] = { ...f, type: e.target.value as FieldSchema["type"] };
                    setEditing({ ...editing, fields });
                  }}
                >
                  <option value="text">text</option>
                  <option value="textarea">textarea</option>
                  <option value="tel">tel</option>
                  <option value="select">select</option>
                </select>
                {f.type === "select" && (
                  <input
                    placeholder="варианты через запятую"
                    value={(f.options || []).join(", ")}
                    onChange={(e) => {
                      const fields = [...editing.fields];
                      fields[i] = {
                        ...f,
                        options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      };
                      setEditing({ ...editing, fields });
                    }}
                  />
                )}
                <label className="admin-field-req">
                  <input
                    type="checkbox"
                    checked={!!f.required}
                    onChange={(e) => {
                      const fields = [...editing.fields];
                      fields[i] = { ...f, required: e.target.checked };
                      setEditing({ ...editing, fields });
                    }}
                  />
                  *
                </label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() =>
                    setEditing({ ...editing, fields: editing.fields.filter((_, j) => j !== i) })
                  }
                  aria-label="Удалить поле"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                setEditing({
                  ...editing,
                  fields: [...editing.fields, { name: "", label: "", type: "text", required: true }],
                })
              }
            >
              + Поле
            </button>
          </div>

          <div className="admin-form-actions">
            <button className="btn btn-primary" type="submit" disabled={!editing.id || !editing.title}>
              Сохранить
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setEditing(null)}>
              Отмена
            </button>
          </div>
        </form>
      )}

      <h2 className="section-title">Каталог услуг</h2>
      {services === null && <div className="muted">Загрузка…</div>}
      {services !== null && (
        <div className="list">
          {services.map((s) => (
            <div key={s.id} className="card service-card">
              <div className="service-icon">{s.icon || "📋"}</div>
              <div className="service-body">
                <div className="service-title">{s.title}</div>
                <div className="service-desc">
                  {s.description} · <code>/{s.id}</code>
                  {customIds.has(s.id) ? " · добавлено в админке" : " · из API"}
                </div>
              </div>
              {customIds.has(s.id) ? (
                <div className="admin-row-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => startEdit(s.id)}>
                    Изменить
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => remove(s.id)}>
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
      )}
    </div>
  );
}

