// Источник user_id из MAX-моста (или из initData, если мост недоступен).

function getBridge() {
  if (typeof window === "undefined") return null;
  return window.WebApp ?? window.MAX ?? null;
}

export function getInitData(): string {
  const bridge = getBridge();
  return bridge?.initData ?? localStorage.getItem("initData") ?? "";
}

/** ID текущего пользователя MAX; null — если открыто не через бота. */
export function getUserId(): number | null {
  const bridge = getBridge();
  const id = bridge?.user?.id;
  if (id && id > 0) return id;

  // Фолбэк: поле user в initData (user={"id":123,...}, возможно URL-кодированное)
  const initData = getInitData();
  if (!initData) return null;
  try {
    const raw = new URLSearchParams(initData).get("user");
    if (raw) {
      const parsed = JSON.parse(raw) as { id?: number };
      if (parsed.id && parsed.id > 0) return parsed.id;
    }
  } catch {
    /* ignore */
  }
  return null;
}
