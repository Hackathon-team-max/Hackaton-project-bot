import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHistory, type HistoryEntry } from "../lib/history";
import { getTask } from "../api/client";
import type { TaskStatusValue } from "../api/types";
import { useMaxBridge } from "../bridge/useMaxBridge";
import { useTheme } from "../lib/theme";
import { getProfile, isProfileEmpty } from "../lib/profile";
import EmptyState from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";

interface Row {
  entry: HistoryEntry;
  status?: TaskStatusValue;
}

const STATUS_LABEL: Record<TaskStatusValue, { text: string; cls: string }> = {
  running: { text: "В работе", cls: "run" },
  success: { text: "Готово", cls: "ok" },
  error: { text: "Ошибка", cls: "fail" },
};

export default function Home() {
  const { user } = useMaxBridge();
  const { theme, toggle } = useTheme();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    const entries = getHistory();
    setRows(entries.map((entry) => ({ entry })));
    entries.forEach(async (entry, i) => {
      try {
        const task = await getTask(entry.taskId);
        setRows((prev) => {
          if (!prev) return prev;
          const next = [...prev];
          next[i] = { ...next[i], status: task.status };
          return next;
        });
      } catch {
        /* ignore */
      }
    });
  }, []);

  const profile = getProfile();
  const fullName = [profile.lastName, profile.firstName, profile.middleName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const name = isProfileEmpty(profile) ? user?.name || "Гость" : fullName;
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
          <div className="user-sub">Профиль · ФИО, паспорт, СНИЛС</div>
        </div>
        <span className="chevron">›</span>
      </Link>

      <h2 className="section-title">Мои заявки</h2>

      {rows === null && (
        <div className="list">
          <Skeleton h={72} r={12} />
          <Skeleton h={72} r={12} />
        </div>
      )}

      {rows !== null && rows.length === 0 && (
        <EmptyState
          icon="🗂️"
          title="Заявок пока нет"
          subtitle="Подать заявку на услугу можно через бота — она появится здесь"
        />
      )}

      {rows !== null && rows.length > 0 && (
        <div className="list">
          {rows.map(({ entry, status }) => {
            const s = status ? STATUS_LABEL[status] : null;
            return (
              <Link key={entry.taskId} to={`/task/${entry.taskId}`} className="card service-card">
                <div className="service-body">
                  <div className="service-title">{entry.serviceTitle}</div>
                  <div className="service-desc">
                    {new Date(entry.createdAt).toLocaleString("ru-RU")} · #{entry.taskId}
                  </div>
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
