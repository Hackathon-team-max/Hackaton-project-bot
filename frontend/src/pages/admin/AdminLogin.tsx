import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { isAdminAuthorized, loginAdmin } from "../../lib/adminAuth";
import { useTheme } from "../../lib/theme";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from || "/admin";

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (loginAdmin(password)) {
      navigate(from, { replace: true });
    } else {
      setError("Неверный пароль");
    }
  };

  if (isAdminAuthorized()) {
    navigate("/admin", { replace: true });
    return null;
  }

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1 className="page-title">Вход в админку</h1>
        <button type="button" className="theme-toggle" onClick={toggle} aria-label="Переключить тему">
          {theme === "dark" ? "🌙" : "☀️"}
        </button>
      </div>

      <form className="card form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label className="field-label" htmlFor="admin-password">
            Пароль
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            placeholder="Введите пароль"
          />
          {error && <div className="field-error">{error}</div>}
        </div>
        <button className="btn btn-primary btn-block" type="submit" disabled={!password}>
          Войти
        </button>
      </form>
    </div>
  );
}