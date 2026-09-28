import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMaxBridge } from "../integrations/max/MaxBridge";
import { ApiError } from "../api/errors";
import type { Application, DocumentsResponse } from "../api/types";
import { applicationRepository } from "../repositories/applications";
import { documentRepository } from "../repositories/documents";
import { applicationProgress, buildChecklist } from "../lib/checklist";
import EmptyState from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";

export default function TaskResult() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { sendMessageToBot } = useMaxBridge();
  const [sent, setSent] = useState(false);
  const [app, setApp] = useState<Application | null>(null);
  const [docs, setDocs] = useState<DocumentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Заявка — из repository; документы чеклиста — только из реального API.
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

  if (loading) {
    return (
      <div className="page">
        <Skeleton h={64} w={64} r={32} />
        <div style={{ height: 16 }} />
        <Skeleton h={28} w="60%" />
        <div style={{ height: 8 }} />
        <Skeleton h={40} r={12} />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="page">
        <EmptyState
          icon="🗂️"
          title="Заявка не найдена"
          subtitle={error || "Откройте её из раздела «Мои заявки»"}
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
  const missing = items.filter((it) => it.required && !it.done);

  return (
    <div className="page result-page">
      <div className={`result-badge ${finished ? "ok" : "fail"}`}>{finished ? "✓" : "✕"}</div>
      <h1 className="page-title center">{finished ? "Готово!" : "Не хватает документов"}</h1>
      <p className="page-sub center">
        {finished
          ? "Все обязательные документы отмечены — заявку можно подавать"
          : `Обязательных документов без отметки: ${missing.length}`}
      </p>

      {error && (
        <p className="page-sub center" role="alert">
          {error}
        </p>
      )}

      <div className="card result-card">
        <div className="result-row">
          <span>Вуз</span>
          <strong>{app.universityName}</strong>
        </div>
        <div className="result-row">
          <span>Заявка</span>
          <strong>#{app.id}</strong>
        </div>
        <div className="result-row">
          <span>Статус</span>
          <strong>{app.status === "submitted" ? "Заявка подана" : "Черновик"}</strong>
        </div>
        <div className="result-row">
          <span>Прогресс</span>
          <strong>
            {done} из {total} ({progress}%)
          </strong>
        </div>
      </div>

      {!finished && (
        <section className="card">
          <h2 className="section-title">Осталось отметить</h2>
          <ul className="steps" style={{ marginTop: 8 }}>
            {missing.map((it, i) => (
              <li key={i}>{it.title}</li>
            ))}
          </ul>
        </section>
      )}

      <button className="btn btn-primary btn-block" onClick={() => navigate(`/task/${id}`)}>
        К чеклисту
      </button>
      <button
        className="btn btn-secondary btn-block"
        disabled={sent}
        onClick={() => {
          sendMessageToBot(
            `Заявка «${app.title}» (${app.universityName}): отмечено ${done} из ${total} документов`
          );
          setSent(true);
        }}
      >
        {sent ? "Отправлено в чат ✓" : "Отправить в чат"}
      </button>

      <Link className="link-center" to="/">
        На главную
      </Link>
    </div>
  );
}
