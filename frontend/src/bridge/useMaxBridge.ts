import { useEffect, useMemo, useState } from "react";
import type { MaxBridge, MaxUser } from "./max";

function getRawBridge() {
  if (typeof window === "undefined") return null;
  return window.WebApp ?? window.MAX ?? null;
}

function extractUser(raw: NonNullable<ReturnType<typeof getRawBridge>> | null): MaxUser | null {
  const u = raw?.user;
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
