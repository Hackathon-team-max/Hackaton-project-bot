import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMaxBridge } from "../lib/maxbridge";
import { getApplication, applicationProgress } from "../lib/history";
import EmptyState from "../components/EmptyState";

export default function TaskResult() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { sendMessageToBot } = useMaxBridge();
  const [sent, setSent] = useState(false);
  const app = getApplication(id);

  if (!app) {
    return (
      <div className="page">
        <EmptyState
          icon="🗂️"
          title="Заявка не найдена"
          subtitle="Откройте её из раздела «Мои заявки»"
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
  const missing = app.items.filter((it) => it.required && !it.done);

  return (
    <div className="page result-page">
      <div className={`result-badge ${finished ? "ok" : "fail"}`}>{finished ? "✓" : "✕"}</div>
      <h1 className="page-title center">{finished ? "Готово!" : "Не хватает документов"}</h1>
      <p className="page-sub center">
        {finished
          ? "Все обязательные документы отмечены — заявку можно подавать"
          : `Обязательных документов без отметки: ${missing.length}`}
      </p>

      <div className="card result-card">
        <div className="result-row">
          <span>Вуз</span>
          <strong>{app.universityName}</strong>
        </div>
        <div className="result-row">
          <span>Заявка</span>
          <strong>#{app.taskId}</strong>
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
