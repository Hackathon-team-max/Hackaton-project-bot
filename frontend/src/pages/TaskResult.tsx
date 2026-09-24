import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ApiError, getTask } from "../api/client";
import type { Task } from "../api/types";
import { useMaxBridge } from "../bridge/useMaxBridge";
import { getHistory } from "../lib/history";
import EmptyState from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";

export default function TaskResult() {
  const { id = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { sendMessageToBot } = useMaxBridge();
  const [task, setTask] = useState<Task | null>((location.state as { task?: Task })?.task ?? null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (task) return;
    getTask(id)
      .then(setTask)
      .catch((e: ApiError) => setError(e.userMessage));
  }, [id, task]);

  const serviceTitle = getHistory().find((h) => h.taskId === id)?.serviceTitle || "заявка";

  if (error) {
    return (
      <div className="page">
        <EmptyState icon="⚠️" title="Не удалось получить результат" subtitle={error} />
        <button className="btn btn-primary btn-block" onClick={() => navigate(`/task/${id}`)}>
          К статусу
        </button>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="page">
        <Skeleton h={64} w={64} r={32} />
        <div style={{ height: 16 }} />
        <Skeleton h={24} w="70%" />
        <div style={{ height: 12 }} />
        <Skeleton h={80} r={12} />
      </div>
    );
  }

  const success = task.status === "success";

  return (
    <div className="page result-page">
      <div className={`result-badge ${success ? "ok" : "fail"}`}>{success ? "✓" : "✕"}</div>
      <h1 className="page-title center">{success ? "Готово!" : "Что-то пошло не так"}</h1>
      <p className="page-sub center">
        {success ? task.resultMessage || "Документы собраны" : task.errorMessage || "Не удалось выполнить заявку"}
      </p>

      <div className="card result-card">
        <div className="result-row">
          <span>Услуга</span>
          <strong>{serviceTitle}</strong>
        </div>
        <div className="result-row">
          <span>Задача</span>
          <strong>#{task.id}</strong>
        </div>
        <div className="result-row">
          <span>Статус</span>
          <strong className={success ? "text-ok" : "text-fail"}>{success ? "Выполнено" : "Ошибка"}</strong>
        </div>
      </div>

      {success ? (
        <>
          {task.fileUrl && (
            <a className="btn btn-primary btn-block" href={task.fileUrl} download>
              Скачать документы
            </a>
          )}
          <button
            className="btn btn-secondary btn-block"
            disabled={sent}
            onClick={() => {
              sendMessageToBot(`Заявка «${serviceTitle}» (${task.id}): ${task.resultMessage || "выполнена"}`);
              setSent(true);
            }}
          >
            {sent ? "Отправлено в чат ✓" : "Отправить в чат"}
          </button>
        </>
      ) : (
        <button className="btn btn-primary btn-block" onClick={() => navigate(`/service/${task.serviceId}`)}>
          Повторить
        </button>
      )}

      <Link className="link-center" to="/">
        На главную
      </Link>
    </div>
  );
}
