// MAX Bridge одним файлом: доступ к window.WebApp, получение user_id
// и React-хук useMaxBridge. Мост сам знает, кто открыл мини-приложение,
// бот в передаче user_id не участвует.

import { useEffect, useMemo, useState } from "react";

export interface MaxUser {
  id: number;
  name: string;
  avatar?: string;
}

export interface MaxBridge {
  initData: string;
  user: MaxUser | null;
  sendMessageToBot(text: string): void;
  isReady: boolean;
}

declare global {
  interface Window {
    WebApp?: {
      initData?: string;
      initDataUnsafe?: {
        user?: {
          id?: number;
          first_name?: string;
          last_name?: string;
          username?: string;
          photo_url?: string;
        };
      };
      user?: {
        id?: number;
        first_name?: string;
        last_name?: string;
        username?: string;
        photo_url?: string;
      };
      ready?: () => void;
      expand?: () => void;
      sendData?: (data: string) => void;
      sendMessage?: (text: string) => void;
      HapticFeedback?: { impactOccurred?: (style: string) => void };
    };
    MAX?: Window["WebApp"];
  }
}

type RawBridge = NonNullable<Window["WebApp"]>;

function getRawBridge(): RawBridge | null {
  if (typeof window === "undefined") return null;
  return window.WebApp ?? window.MAX ?? null;
}

/** initData из моста (для валидации на сервере). */
export function getInitData(): string {
  const bridge = getRawBridge();
  return bridge?.initData ?? localStorage.getItem("initData") ?? "";
}

/** ID текущего пользователя MAX; null — если мост недоступен. */
export function getUserId(): number | null {
  const bridge = getRawBridge();
  const direct = bridge?.user?.id;
  if (direct && direct > 0) return direct;

  // Фолбэк: initDataUnsafe (объект) или поле user в самой initData (URL-кодировано)
  const unsafeId = bridge?.initDataUnsafe?.user?.id;
  if (unsafeId && unsafeId > 0) return unsafeId;

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

function extractUser(raw: RawBridge | null): MaxUser | null {
  const u = raw?.user ?? raw?.initDataUnsafe?.user;
  if (!u) return null;
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return {
    id: u.id ?? 0,
    name: name || u.username || "Гость",
    avatar: u.photo_url,
  };
}

export function useMaxBridge(): MaxBridge {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const raw = getRawBridge();
    if (!raw) return;
    try {
      raw.ready?.();
      raw.expand?.();
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  return useMemo(() => {
    const raw = getRawBridge();
    const initData = raw?.initData ?? "";
    const user = extractUser(raw);
    const sendMessageToBot = (text: string) => {
      if (!raw) return;
      try {
        raw.sendMessage?.(text);
        raw.sendData?.(text);
      } catch {
        /* ignore */
      }
    };
    return { initData, user, sendMessageToBot, isReady: ready };
  }, [ready]);
}
