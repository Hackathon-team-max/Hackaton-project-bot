import { z } from "zod";
import type { FieldSchema } from "../api/types";

const SNILS_RE = /^\d{3}-\d{3}-\d{3}\s?\d{2}$/;
const INN_RE = /^\d{10}$|^\d{12}$/;
const DATE_RE = /^\d{2}\.\d{2}\.\d{4}$/;

export function buildSchema(fields: FieldSchema[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    let base: z.ZodString = z.string();
    if (f.type === "tel" && f.name === "snils") {
      base = z.string().regex(SNILS_RE, "Неверный формат СНИЛС (XXX-XXX-XXX XX)");
    } else if (f.type === "tel" && f.name === "inn") {
      base = z.string().regex(INN_RE, "Неверный формат ИНН (10 или 12 цифр)");
    } else if (f.type === "tel" && f.name === "birthDate") {
      base = z.string().regex(DATE_RE, "Неверный формат даты (ДД.ММ.ГГГГ)");
    }
    if (f.required) {
      shape[f.name] = base.min(1, "Обязательное поле");
    } else {
      shape[f.name] = base.optional().or(z.literal(""));
    }
  }
  return z.object(shape);
}
