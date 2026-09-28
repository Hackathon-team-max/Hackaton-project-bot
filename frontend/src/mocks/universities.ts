import type { University } from "../api/types";

/**
 * Seed-данные preview-режима для репозитория вузов (админка + навигация).
 * Записываются в localStorage при первом обращении, дальше админ CRUD.
 */
export const PREVIEW_UNIVERSITIES: University[] = [
  { id: "bmstu", name: "МГТУ им. Н.Э. Баумана", description: "Технический вуз, приём по единым правилам.", icon: "🎓" },
  { id: "msu", name: "МГУ им. М.В. Ломоносова", description: "Крупнейший классический вуз России.", icon: "🏛" },
  { id: "spbu", name: "СПбГУ", description: "Главный вуз Санкт-Петербурга.", icon: "🏛" },
  { id: "mipt", name: "МФТИ", description: "Физико-технологический университет.", icon: "⚛️" },
  { id: "hse", name: "НИУ ВШЭ", description: "Экономика, социальные и гуманитарные науки.", icon: "📊" },
  { id: "mgimo", name: "МГИМО", description: "Международные отношения и право.", icon: "🌍" },
  { id: "rudn", name: "РУДН", description: "Университет дружбы народов.", icon: "🤝" },
  { id: "mie", name: "МЭИ", description: "Энергетический институт.", icon: "⚡" },
  { id: "mifi", name: "МИФИ", description: "Национальный исследовательский ядерный университет.", icon: "☢️" },
  { id: "itmo", name: "ИТМО", description: "Информационные технологии и оптика.", icon: "💻" },
];
