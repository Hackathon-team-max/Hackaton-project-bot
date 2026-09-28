import { useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { isAdminAuthorized, logoutAdmin } from "../../lib/adminAuth";
import { useTheme } from "../../lib/theme";
import {
  getCustomServices,
  upsertCustomService,
  removeCustomService,
} from "../../lib/serviceStore";
import { getServices } from "../../repositories/services";
import type { Service, ServiceDetail } from "../../api/types";
import ServiceList from "./ServiceList";
import ServiceEditor from "./ServiceEditor";

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
    getServices()
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
        <ServiceEditor
          editing={editing}
          isNew={!getCustomServices().some((s) => s.id === editing.id)}
          onChange={setEditing}
          onSave={onSave}
          onCancel={() => setEditing(null)}
        />
      )}

      <h2 className="section-title">Каталог услуг</h2>
      {services === null && <div className="muted">Загрузка…</div>}
      {services !== null && (
        <ServiceList services={services} customIds={customIds} onEdit={startEdit} onRemove={remove} />
      )}
    </div>
  );
}
