import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createTask, fetchService, ApiError } from "../api/client";
import type { ServiceDetail } from "../api/types";
import { buildSchema } from "../lib/schema";
import { addHistory } from "../lib/history";
import EmptyState from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";

type FormValues = Record<string, string>;

export default function ServiceDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ServiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: detail ? zodResolver(buildSchema(detail.fields)) : undefined,
    values: {} as FormValues,
  });

  useEffect(() => {
    setError(null);
    setDetail(null);
    fetchService(id)
      .then(setDetail)
      .catch((e: ApiError) => setError(e.message));
  }, [id]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const task = await createTask(id, values);
      addHistory({ taskId: task.id, serviceId: id, serviceTitle: detail?.title || id, createdAt: Date.now() });
      navigate(`/task/${task.id}`);
    } catch (e) {
      setSubmitError((e as ApiError).userMessage || "Не удалось создать заявку");
    } finally {
      setSubmitting(false);
    }
  });

  if (error) {
    return (
      <div className="page">
        <EmptyState
          icon="⚠️"
          title="Не удалось загрузить услугу"
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

  if (!detail) {
    return (
      <div className="page">
        <Skeleton h={28} w="65%" />
        <div style={{ height: 16 }} />
        <Skeleton h={16} w="100%" />
        <div style={{ height: 24 }} />
        <Skeleton h={140} r={12} />
        <div style={{ height: 12 }} />
        <Skeleton h={140} r={12} />
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ‹ На главную
      </Link>
      <h1 className="page-title">{detail.title}</h1>
      <p className="page-sub">{detail.description}</p>

      <section className="card">
        <h2 className="section-title">Шаги</h2>
        <ol className="steps">
          {detail.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      </section>

      <form className="card form" onSubmit={onSubmit} noValidate>
        <h2 className="section-title">Данные</h2>
        {detail.fields.map((f) => (
          <div className="field" key={f.name}>
            <label className="field-label" htmlFor={f.name}>
              {f.label}
              {f.required && <span className="req">*</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea id={f.name} placeholder={f.placeholder} {...register(f.name as Path<FormValues>)} />
            ) : f.type === "select" ? (
              <select id={f.name} defaultValue="" {...register(f.name as Path<FormValues> as Path<FormValues>)}>
                <option value="" disabled>
                  Выберите…
                </option>
                {f.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={f.name}
                type={f.type === "tel" ? "tel" : "text"}
                inputMode={f.type === "tel" ? "numeric" : undefined}
                placeholder={f.placeholder}
                {...register(f.name as Path<FormValues>)}
              />
            )}
            {errors[f.name] && <div className="field-error">{errors[f.name]?.message as string}</div>}
          </div>
        ))}

        {submitError && <div className="form-error">{submitError}</div>}

        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
          {submitting ? "Отправка…" : "Начать"}
        </button>
      </form>
    </div>
  );
}
