import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, confirmAction, getTask } from "../api/client";
import type { Task } from "../api/types";
import ProgressBar from "../components/ProgressBar";
import StatusIcon from "../components/StatusIcon";
import EmptyState from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";

const POLL_MS = 4000;

export default function TaskStatus() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<number | null>(null);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const t = await getTask(id);
      setTask(t);
      setError(null);
      if (t.status === "success" || t.status === "error") {
        if (timer.current) window.clearInterval(timer.current);
        timer.current = null;
        navigate(`/task/${id}/result`, { replace: true, state: { task: t } });
      }
    } catch (e) {
      setError((e as ApiError).userMessage);
    } finally {
      if (manual) setRefreshing(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
    timer.current = window.setInterval(() => load(), POLL_MS);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [load]);

  const onConfirm = async (actionId: string) => {
    setRefreshing(true);
    try {
      const t = await confirmAction(id, actionId);
      setTask(t);
      if (t.status === "success" || t.status === "error") {
        navigate(`/task/${id}/result`, { replace: true, state: { task: t } });
      }
    } catch (e) {
      setError((e as ApiError).userMessage);
    } finally {
      setRefreshing(false);
    }
  };

  if (error && !task) {
    return (
      <div className="page">
        <EmptyState
          icon="⚠️"
          title="Не удалось получить статус"
          subtitle={error}
          action={
            <button className="btn btn-primary" onClick={() => load(true)}>
              Обновить
            </button>
          }
        />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="page">
        <Skeleton h={28} w="50%" />
        <div style={{ height: 20 }} />
        <Skeleton h={24} r={12} />
        <div style={{ height: 20 }} />
        <Skeleton h={72} r={12} />
        <div style={{ height: 12 }} />
        <Skeleton h={72} r={12} />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Статус заявки</h1>
      <p className="page-sub">Задача #{task.id}</p>

      <ProgressBar value={task.progress} />

      {error && <div className="form-error">{error}</div>}

      <div className="list">
        {task.actions.map((a) => (
          <div className="card action-card" key={a.id}>
            <StatusIcon status={a.status} />
            <div className="action-body">
              <div className="action-title">{a.title}</div>
              {a.errorMessage && <div className="field-error">{a.errorMessage}</div>}
              {a.status === "active" && a.needsUser && (
                <div className="action-buttons">
                  {a.link && (
                    <a className="btn btn-secondary btn-sm" href={a.link} target="_blank" rel="noreferrer">
                      Открыть Госуслуги
                    </a>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={() => onConfirm(a.id)} disabled={refreshing}>
                    Подтвердить
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-secondary btn-block" onClick={() => load(true)} disabled={refreshing}>
        {refreshing ? "Обновление…" : "Обновить статус"}
      </button>

      <Link className="link-center" to="/">
        На главную
      </Link>
    </div>
  );
}
