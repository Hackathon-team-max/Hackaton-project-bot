import type { ActionStatus } from "../api/types";

const MAP: Record<ActionStatus, { icon: string; cls: string; label: string }> = {
  done: { icon: "✓", cls: "done", label: "Выполнено" },
  active: { icon: "⏳", cls: "active", label: "В процессе" },
  pending: { icon: "○", cls: "pending", label: "Ожидает" },
  error: { icon: "✕", cls: "error", label: "Ошибка" },
};

export default function StatusIcon({ status }: { status: ActionStatus }) {
  const s = MAP[status];
  return (
    <span className={`status-icon ${s.cls}`} title={s.label} aria-label={s.label}>
      {status === "active" ? <span className="spinner" /> : s.icon}
    </span>
  );
}
