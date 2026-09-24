// Вход в админ-панель: пароль из секретного VITE_ADMIN_PASSWORD (.env),
// флаг авторизации — в sessionStorage (заглушка до появления БД/бэкенда).
const AUTH_KEY = "max_admin_auth";

export function isAdminAuthorized(): boolean {
  try {
    return sessionStorage.getItem(AUTH_KEY) === "1";
  } catch {
    return false;
  }
}

export function loginAdmin(password: string): boolean {
  const expected = import.meta.env.VITE_ADMIN_PASSWORD;
  if (!expected || password !== expected) return false;
  try {
    sessionStorage.setItem(AUTH_KEY, "1");
  } catch {
    /* ignore */
  }
  return true;
}

export function logoutAdmin(): void {
  try {
    sessionStorage.removeItem(AUTH_KEY);
  } catch {
    /* ignore */
  }
}