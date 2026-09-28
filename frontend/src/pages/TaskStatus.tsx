import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/errors";
import type { Application, DocumentsResponse } from "../api/types";
import { applicationRepository } from "../repositories/applications";
import { documentRepository } from "../repositories/documents";
import { applicationProgress, buildChecklist, type ChecklistItem } from "../lib/checklist";
import ProgressBar from "../components/ProgressBar";
import EmptyState from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";

export default function TaskStatus() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState<Application | null>(null);
  const [docs, setDocs] = useState<DocumentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Заявка — из repository (preview: localStorage, production: API);
  // документы чеклиста — только из реального API, в заявке не хранятся.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    applicationRepository
      .getApplication(id)
      .then((a) => {
        if (cancelled) return;
        setApp(a);
        return documentRepository
          .getDocuments(a.universityId)
          .then((d) => {
            if (!cancelled) setDocs(d);
          })
          .catch((e: ApiError) => {
            if (!cancelled) setError(e.userMessage);
          });
      })
      .catch((e: ApiError) => {
        if (!cancelled) setError(e.userMessage);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const toggle = (item: ChecklistItem) => {
    setApp((prev) => {
      if (!prev) return prev;
      const checked = new Set(prev.checkedDocuments);
      if (checked.has(item.title)) checked.delete(item.title);
      else checked.add(item.title);
      const next: Application = { ...prev, checkedDocuments: [...checked] };
      applicationRepository
        .updateApplication(next.id, next.checkedDocuments)
        .catch((e: ApiError) => setError(e.userMessage));
      return next;
    });
  };

  if (loading) {
    return (
      <div className="page">
        <Link to="/" className="back-link">
          ‹ На главную
        </Link>
        <Skeleton h={28} w="65%" />
        <div style={{ height: 8 }} />
        <Skeleton h={16} w="50%" />
        <div style={{ height: 16 }} />
        <Skeleton h={92} r={12} />
        <div style={{ height: 12 }} />
        <Skeleton h={92} r={12} />
      </div>
    );
  }

  if (error && !app) {
    return (
      <div className="page">
        <EmptyState
          icon="🗂️"
          title="Заявка не найдена"
          subtitle={error}
          action={
            <Link className="btn btn-primary" to="/">
              На главную
            </Link>
          }
        />
      </div>
    );
  }

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

  const items = docs ? buildChecklist(app, docs) : [];
  const { progress, done, total, finished } = applicationProgress(items);

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ‹ На главную
      </Link>
      <h1 className="page-title">Чеклист документов</h1>
      <p className="page-sub">
        {app.title} · {app.universityName} · {new Date(app.submittedAt).toLocaleString("ru-RU")}
        {app.status === "submitted" && <span className="text-ok"> · Заявка подана</span>}
      </p>

      {!docs && error && (
        <p className="page-sub" role="alert">
          Не удалось загрузить документы: {error}
        </p>
      )}

      <ProgressBar value={progress} />
      <p className="page-sub">
        Отмечено {done} из {total}
        {finished && <span className="text-ok"> · все обязательные документы готовы</span>}
      </p>

      <div className="list">
        {items.map((it, i) => (
          <div className={`card action-card check-item${it.done ? " is-done" : ""}`} key={i}>
            <input
              type="checkbox"
              className="check-box"
              id={`doc-${i}`}
              checked={it.done}
              onChange={() => toggle(it)}
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
