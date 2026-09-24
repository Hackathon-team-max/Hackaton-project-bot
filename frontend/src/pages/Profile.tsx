import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { saveProfile, getProfile, type Profile as ProfileData } from "../lib/profile";
import { useTheme } from "../lib/theme";

export default function Profile() {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [profile, setProfile] = useState<ProfileData>(() => getProfile());
  const [saved, setSaved] = useState(false);

  const set = <K extends keyof ProfileData>(key: K, value: ProfileData[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
    setSaved(false);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    saveProfile(profile);
    setSaved(true);
  };

  const fullName = [profile.lastName, profile.firstName, profile.middleName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const initial = fullName.charAt(0).toUpperCase() || "?";

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Профиль</h1>
        <button type="button" className="theme-toggle" onClick={toggle} aria-label="Переключить тему">
          {theme === "dark" ? "🌙" : "☀️"}
        </button>
      </div>

      <div className="card user-card profile-head">
        <div className="avatar">{initial}</div>
        <div className="user-meta">
          <div className="user-name">{fullName || "Заполните профиль"}</div>
          <div className="user-sub">Данные хранятся на устройстве</div>
        </div>
      </div>

      <form className="card form" onSubmit={onSubmit}>
        <h2 className="section-title">Личные данные</h2>
        <div className="field">
          <label className="field-label" htmlFor="p-last">Фамилия</label>
          <input id="p-last" value={profile.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="p-first">Имя</label>
          <input id="p-first" value={profile.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="p-middle">Отчество</label>
          <input id="p-middle" value={profile.middleName} onChange={(e) => set("middleName", e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="p-birth">Дата рождения</label>
          <input id="p-birth" type="date" value={profile.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
        </div>

        <h2 className="section-title">Документы</h2>
        <div className="field-row">
          <div className="field">
            <label className="field-label" htmlFor="p-pass-s">Серия паспорта</label>
            <input id="p-pass-s" value={profile.passportSeries} onChange={(e) => set("passportSeries", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="p-pass-n">Номер паспорта</label>
            <input id="p-pass-n" value={profile.passportNumber} onChange={(e) => set("passportNumber", e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="p-pass-who">Кем выдан</label>
          <input id="p-pass-who" value={profile.passportIssuedBy} onChange={(e) => set("passportIssuedBy", e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="p-pass-date">Дата выдачи</label>
          <input id="p-pass-date" type="date" value={profile.passportIssueDate} onChange={(e) => set("passportIssueDate", e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="p-snils">СНИЛС</label>
          <input id="p-snils" value={profile.snils} onChange={(e) => set("snils", e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="p-inn">ИНН</label>
          <input id="p-inn" value={profile.inn} onChange={(e) => set("inn", e.target.value)} />
        </div>

        <h2 className="section-title">Контакты</h2>
        <div className="field">
          <label className="field-label" htmlFor="p-phone">Телефон</label>
          <input id="p-phone" type="tel" value={profile.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="p-email">Email</label>
          <input id="p-email" type="email" value={profile.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="field">
          <label className="field-label" htmlFor="p-address">Адрес</label>
          <textarea id="p-address" rows={2} value={profile.address} onChange={(e) => set("address", e.target.value)} />
        </div>

        <button className="btn btn-primary btn-block" type="submit">
          Сохранить
        </button>
        {saved && <div className="form-success">Профиль сохранён</div>}
      </form>

      <button type="button" className="btn btn-ghost btn-block" onClick={() => navigate("/")}>
        На главную
      </button>
      <Link className="admin-link" to="/admin">Админ-панель</Link>
    </div>
  );
}
