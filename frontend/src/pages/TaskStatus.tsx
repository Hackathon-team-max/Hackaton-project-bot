import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getApplication, saveApplication, applicationProgress, type Application } from "../lib/history";
import ProgressBar from "../components/ProgressBar";
import EmptyState from "../components/EmptyState";

export default function TaskStatus() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState<Application | null>(() => getApplication(id) ?? null);

  const toggle = (index: number) => {
    setApp((prev) => {
      if (!prev) return prev;
      const next: Application = {
        ...prev,
        items: prev.items.map((it, i) => (i === index ? { ...it, done: !it.done } : it)),
      };
      saveApplication(next);
      return next;
    });
  };

  if (!app) {
    return (
      <div className="page">
        <EmptyState
          icon="🗂️"
          title="Заявка не найдена"
          subtitle="Возможно, история была очищена"
          action={
            <Link className="btn btn-primary" to="/">
              На главную
            </Link>
          }
        />
      </div>
    );
  }

  const { progress, done, total, finished } = applicationProgress(app);

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ‹ На главную
      </Link>
      <h1 className="page-title">Чеклист документов</h1>
      <p className="page-sub">
        {app.title} · {app.universityName} · {new Date(app.createdAt).toLocaleString("ru-RU")}
      </p>

      <ProgressBar value={progress} />
      <p className="page-sub">
        Отмечено {done} из {total}
        {finished && <span className="text-ok"> · все обязательные документы готовы</span>}
      </p>

      <div className="list">
        {app.items.map((it, i) => (
          <div className={`card action-card check-item${it.done ? " is-done" : ""}`} key={i}>
            <input
              type="checkbox"
              className="check-box"
              id={`doc-${i}`}
              checked={it.done}
              onChange={() => toggle(i)}
            />
            <div className="action-body">
              <label className="action-title" htmlFor={`doc-${i}`}>
                {it.title}
                {it.required && <span className="req">*</span>}
                {!it.required && <span className="check-optional">не обязательно</span>}
              </label>
              {it.description && <div className="user-sub">{it.description}</div>}
              {it.url && (
                <div className="action-buttons">
                  <a className="btn btn-secondary btn-sm" href={it.url} target="_blank" rel="noreferrer">
                    Открыть на Госуслугах
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-primary btn-block" onClick={() => navigate(`/task/${id}/result`)}>
        К результату
      </button>
    </div>
  );
}
