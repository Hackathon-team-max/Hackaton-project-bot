import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHistory, getApplications, applicationProgress } from "../lib/history";
import { fetchUser, ApiError } from "../api/client";
import { useMaxBridge, getUserId } from "../lib/maxbridge";
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
  ok: { text: "Готово", cls: "ok" },
};

export default function Home() {
  const { user } = useMaxBridge();
  const { theme, toggle } = useTheme();
  // Данные профиля — из БД бэкенда
  const [fullName, setFullName] = useState<string>("");

  useEffect(() => {
    const userId = getUserId();
    if (userId === null) return;
    fetchUser(userId)
      .then((res) => {
        if (res.exists) setFullName(res.full_name);
      })
      .catch((e: ApiError) => {
        console.warn(e.message);
      });
  }, []);

  // Заявки — чеклисты документов (локальное хранилище, бэкенда пока нет)
  const apps = getApplications();
  const appIds = new Set(apps.map((a) => a.taskId));
  const legacy = getHistory().filter((h) => !appIds.has(h.taskId));
  const rows: Row[] = [
    ...apps.map((a) => ({
      taskId: a.taskId,
      title: a.title,
      subtitle: `${a.universityName} · ${new Date(a.createdAt).toLocaleString("ru-RU")}`,
      status: applicationProgress(a).finished ? ("ok" as const) : ("run" as const),
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
        <h1 className="page-title">Помощник</h1>
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
