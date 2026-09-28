import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/errors";
import type { DocumentsResponse, UserProfile } from "../api/types";
import { userRepository } from "../repositories/users";
import { documentRepository } from "../repositories/documents";
import { getUserId } from "../integrations/max/MaxBridge";
import { UNIVERSITIES } from "../lib/universities";
import { useTheme } from "../lib/theme";
import EmptyState from "../components/EmptyState";
import { Skeleton } from "../components/Skeleton";

type Form = Omit<UserProfile, "user_id">;

const EMPTY: Form = { full_name: "", address: "", snils: "", email: "", passport: "", university_id: "" };

export default function Profile() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const userId = getUserId();

  const [loading, setLoading] = useState(userId !== null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // «Мои ссылки и рекомендации» — документы выбранного вуза
  const [docs, setDocs] = useState<DocumentsResponse | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);

  const loadProfile = () => {
    if (userId === null) return;
    setLoading(true);
    setLoadError(null);
    userRepository
      .getUser(userId)
      .then((res) => {
        if (res.exists) {
          setExists(true);
          setForm({
            full_name: res.full_name,
            address: res.address,
            snils: res.snils,
            email: res.email,
            passport: res.passport,
            university_id: res.university_id,
          });
        }
        // exists: false — БД отвечает, пользователя нет: форма остаётся пустой
      })
      .catch((e: ApiError) => {
        // «Пользователь не найден» = БД отвечает, но записи нет → заполняем с нуля.
        // (Бэк может вернуть и 404, и 200 с телом {"error": "..."} — ловим оба.)
        const notFound =
          e.status === 404 || e.userMessage.toLowerCase().includes("не найден");
        if (notFound) {
          setExists(false);
          setForm(EMPTY);
        } else {
          // БД недоступна (бэкенд выключен, таймаут, 5xx)
          setLoadError(e.userMessage);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const uni = form.university_id;
    if (!uni) {
      setDocs(null);
      setDocsError(null);
      return;
    }
    let cancelled = false;
    setDocsLoading(true);
    setDocsError(null);
    documentRepository
      .getDocuments(uni)
      .then((d) => {
        if (!cancelled) setDocs(d);
      })
      .catch((e: ApiError) => {
        if (!cancelled) {
          setDocs(null);
          setDocsError(e.userMessage);
        }
      })
      .finally(() => {
        if (!cancelled) setDocsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.university_id]);

  const setField = (key: keyof Form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
    setSaveError(null);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (userId === null) return;
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      await userRepository.saveProfile(userId, form);
      setExists(true);
      setSaved(true);
    } catch (err) {
      setSaveError((err as ApiError).userMessage || "Не удалось сохранить профиль");
    } finally {
      setSaving(false);
    }
  };

  const initial = form.full_name.trim().charAt(0).toUpperCase() || "Г";
  const linkItems = docs ? [...docs.mandatory, ...docs.additional] : [];

  if (userId === null) {
    return (
      <div className="page">
        <Link to="/" className="back-link">
          ‹ На главную
        </Link>
        <EmptyState
          icon="🔒"
          title="Профиль недоступен"
          subtitle="Откройте приложение через бота — бот передаст ваш user_id, чтобы загрузить профиль"
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
      <div className="page-header">
        <h1 className="page-title">Личный кабинет</h1>
        <button type="button" className="theme-toggle" onClick={toggle} aria-label="Переключить тему">
          {theme === "dark" ? "🌙" : "☀️"}
        </button>
      </div>

      <div className="card user-card profile-head">
        <div className="avatar">{initial}</div>
        <div className="user-meta">
          <div className="user-name">{form.full_name.trim() || "Заполните профиль"}</div>
          <div className="user-sub">
            {exists ? "Профиль сохранён в БД" : "Профиль ещё не сохранён"} · user #{userId}
          </div>
        </div>
      </div>

      {loading && (
        <div className="card">
          <Skeleton h={16} w="40%" />
          <div style={{ height: 12 }} />
          <Skeleton h={44} r={12} />
          <div style={{ height: 12 }} />
          <Skeleton h={44} r={12} />
          <div style={{ height: 12 }} />
          <Skeleton h={44} r={12} />
        </div>
      )}

      {/* БД недоступна — блокируем заполнение и предлагаем повторить */}
      {!loading && loadError && (
        <EmptyState
          icon="⚠️"
          title="База данных недоступна"
          subtitle={`${loadError}. Профиль нельзя заполнить, пока сервер не отвечает.`}
          action={
            <button type="button" className="btn btn-primary" onClick={loadProfile}>
              Повторить
            </button>
          }
        />
      )}

      {!loading && !loadError && (
        <form className="form" onSubmit={onSubmit} noValidate>
          <section className="card">
            <h2 className="section-title">Личные данные</h2>
            <div className="field">
              <label className="field-label" htmlFor="p-full">
                ФИО<span className="req">*</span>
              </label>
              <input
                id="p-full"
                value={form.full_name}
                onChange={(e) => setField("full_name", e.target.value)}
                placeholder="Иванов Иван Иванович"
                autoComplete="name"
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="p-address">
                Адрес<span className="req">*</span>
              </label>
              <textarea
                id="p-address"
                rows={2}
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                placeholder="Город, улица, дом"
              />
            </div>
          </section>

          <section className="card">
            <h2 className="section-title">Документы</h2>
            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor="p-snils">
                  СНИЛС<span className="req">*</span>
                </label>
                <input
                  id="p-snils"
                  value={form.snils}
                  onChange={(e) => setField("snils", e.target.value)}
                  placeholder="000-000-000 00"
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="p-passport">
                  Паспорт<span className="req">*</span>
                </label>
                <input
                  id="p-passport"
                  value={form.passport}
                  onChange={(e) => setField("passport", e.target.value)}
                  placeholder="00 00 000000"
                />
              </div>
            </div>
          </section>

          <section className="card">
            <h2 className="section-title">Контакты и вуз</h2>
            <div className="field">
              <label className="field-label" htmlFor="p-email">
                Email<span className="req">*</span>
              </label>
              <input
                id="p-email"
                type="email"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="p-uni">
                Вуз<span className="req">*</span>
              </label>
              <select
                id="p-uni"
                value={form.university_id}
                onChange={(e) => setField("university_id", e.target.value)}
              >
                <option value="" disabled>
                  Выберите вуз
                </option>
                {UNIVERSITIES.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {saveError && <div className="form-error">{saveError}</div>}
          {saved && <div className="form-success">Профиль сохранён</div>}

          <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
            {saving ? "Сохранение…" : "Сохранить"}
          </button>
        </form>
      )}

      {form.university_id && (
        <section className="card">
          <h2 className="section-title">Мои ссылки и рекомендации</h2>
          <p className="page-sub">{docs?.university_name || "Документы выбранного вуза"}</p>
          {docsLoading && (
            <div className="list">
              <Skeleton h={56} r={12} />
              <Skeleton h={56} r={12} />
            </div>
          )}
          {!docsLoading && docsError && <div className="form-error">{docsError}</div>}
          {!docsLoading && !docsError && docs && (
            <div className="list">
              {linkItems.map((item, idx) => (
                <div className="action-card" key={`${idx}-${item.title}`}>
                  <div className="action-body">
                    <div className="action-title">{item.title}</div>
                    {item.description && <div className="user-sub">{item.description}</div>}
                    {item.url && (
                      <div className="action-buttons">
                        <a className="btn btn-secondary btn-sm" href={item.url} target="_blank" rel="noreferrer">
                          Открыть ссылку
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <button type="button" className="btn btn-ghost btn-block" onClick={() => navigate("/")}>
        На главную
      </button>
      <Link className="admin-link" to="/admin">
        Админ-панель
      </Link>
    </div>
  );
}

