import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHistory } from "../storage/taskHistory";
import type { Application } from "../api/types";
import { applicationRepository } from "../repositories/applications";
import { userRepository } from "../repositories/users";
import { ApiError } from "../api/errors";
import { useMaxBridge, getUserId } from "../integrations/max/MaxBridge";
import { useTheme } from "../lib/theme";
import EmptyState from "../components/EmptyState";

interface Row {
  taskId: string;
  title: string;
  subtitle: string;
  status?: "run" | "ok";
}

const STATUS_LABEL = {
  run: { text: "В работе", cls: "run" },
  ok: { text: "Заявка подана", cls: "ok" },
};

export default function Home() {
  const { user } = useMaxBridge();
  const { theme, toggle } = useTheme();
  // Данные профиля — из БД бэкенда
  const [fullName, setFullName] = useState<string>("");
  // Заявки — из repository (preview: localStorage, production: API)
  const [apps, setApps] = useState<Application[]>([]);

  useEffect(() => {
    // Заявки грузим всегда — независимо от наличия MAX-моста
    // (вне MAX user_id нет, но preview-заглушка заявок должна быть видна).
    applicationRepository
      .getApplications()
      .then(setApps)
      .catch((e: ApiError) => console.warn(e.message));
  }, []);

  useEffect(() => {
    // Имя профиля — только при известном user_id из MAX-моста.
    const userId = getUserId();
    if (userId === null) return;
    userRepository
      .getUser(userId)
      .then((res) => {
        if (res.exists) setFullName(res.full_name);
      })
      .catch((e: ApiError) => {
        console.warn(e.message);
      });
  }, []);

  const appIds = new Set(apps.map((a) => a.id));
  const legacy = getHistory().filter((h) => !appIds.has(h.taskId));
  const rows: Row[] = [
    ...apps.map((a) => ({
      taskId: a.id,
      title: a.title,
      subtitle: `${a.universityName} · ${new Date(a.submittedAt).toLocaleString("ru-RU")}`,
      status: (a.status === "submitted" ? "ok" : "run") as "run" | "ok",
    })),
    ...legacy.map((h) => ({
      taskId: h.taskId,
      title: h.serviceTitle,
      subtitle: `${new Date(h.createdAt).toLocaleString("ru-RU")} · #${h.taskId}`,
    })),
  ];

  const name = fullName.trim() || user?.name || "Гость";
  const initial = name.charAt(0).toUpperCase() || "?";

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">DocFlow</h1>
        <button type="button" className="theme-toggle" onClick={toggle} aria-label="Переключить тему">
          {theme === "dark" ? "🌙" : "☀️"}
        </button>
      </div>

      <Link to="/profile" className="card user-card profile-tile">
        <div className="avatar">{user?.avatar ? <img src={user.avatar} alt="" /> : initial}</div>
        <div className="user-meta">
          <div className="user-name">{name}</div>
          <div className="user-sub">Личный кабинет · профиль и ссылки</div>
        </div>
        <span className="chevron">›</span>
      </Link>

      <h2 className="section-title">Мои заявки</h2>

      {rows.length === 0 && (
        <EmptyState
          icon="🗂️"
          title="Заявок пока нет"
          subtitle="Заявка появится здесь после подачи через бота"
        />
      )}

      {rows.length > 0 && (
        <div className="list">
          {rows.map(({ taskId, title, subtitle, status }) => {
            const s = status ? STATUS_LABEL[status] : null;
            return (
              <Link key={taskId} to={`/task/${taskId}`} className="card service-card">
                <div className="service-body">
                  <div className="service-title">{title}</div>
                  <div className="service-desc">{subtitle}</div>
                </div>
                {s && <span className={`pill ${s.cls}`}>{s.text}</span>}
                <span className="chevron">›</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
