import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/errors";
import type { DocumentItem, DocumentsResponse } from "../api/types";
import { documentRepository } from "../repositories/documents";
import { applicationRepository } from "../repositories/applications";
import { addHistory } from "../storage/taskHistory";
import EmptyState from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";

function DocCard({ item }: { item: DocumentItem }) {
  return (
    <div className="card action-card">
      <div className="action-body">
        <div className="action-title">{item.title}</div>
        {item.description && <div className="user-sub">{item.description}</div>}
        {item.url && (
          <div className="action-buttons">
            <a className="btn btn-secondary btn-sm" href={item.url} target="_blank" rel="noreferrer">
              Открыть на Госуслугах
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ServiceDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocumentsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setDocs(null);
    setError(null);
    setLoading(true);
    documentRepository
      .getDocuments(id)
      .then(setDocs)
      .catch((e: ApiError) => setError(e.userMessage))
      .finally(() => setLoading(false));
  }, [id]);

  const onCreateApplication = async () => {
    if (!docs) return;
    try {
      const app = await applicationRepository.submitApplication({
        universityId: docs.university_id,
        universityName: docs.university_name,
        title: docs.title,
      });
      addHistory({
        taskId: app.id,
        serviceId: app.universityId,
        serviceTitle: app.title,
        createdAt: Date.parse(app.submittedAt),
      });
      navigate(`/task/${app.id}`);
    } catch (e) {
      setSubmitError((e as ApiError).userMessage || "Не удалось подать заявку");
    }
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

  if (error || !docs) {
    return (
      <div className="page">
        <Link to="/" className="back-link">
          ‹ На главную
        </Link>
        <EmptyState
          icon="⚠️"
          title="Не удалось загрузить документы"
          subtitle={error || "Вуз не найден"}
          action={
            <Link className="btn btn-primary" to="/">
              На главную
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="page">
      <Link to="/" className="back-link">
        ‹ На главную
      </Link>

      <div>
        <h1 className="page-title">{docs.title}</h1>
        <p className="page-sub">
          {docs.university_name} · {docs.description}
        </p>
      </div>

      <section>
        <h2 className="section-title">Обязательные документы</h2>
        <div className="list" style={{ marginTop: 8 }}>
          {docs.mandatory.length === 0 && <p className="page-sub">Список пуст</p>}
          {docs.mandatory.map((item, idx) => (
            <DocCard key={`m-${idx}-${item.title}`} item={item} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">Дополнительные документы</h2>
        <div className="list" style={{ marginTop: 8 }}>
          {docs.additional.length === 0 && <p className="page-sub">Список пуст</p>}
          {docs.additional.map((item, idx) => (
            <DocCard key={`a-${idx}-${item.title}`} item={item} />
          ))}
        </div>
      </section>

      <div className="action-buttons">
        <button type="button" className="btn btn-primary" onClick={onCreateApplication}>
          Подать заявку
        </button>
        <Link to="/profile" className="btn btn-secondary">
          Мои ссылки и рекомендации
        </Link>
      </div>
      {submitError && (
        <p className="page-sub" role="alert">
          {submitError}
        </p>
      )}
      <p className="page-sub">
        После подачи заявка появится в разделе «Мои заявки» — внутри чеклист документов.
      </p>
    </div>
  );
}
