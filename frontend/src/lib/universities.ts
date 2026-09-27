// Вузы, поддерживаемые бэкендом (/api/universities/:uniId/...).
// ID — по контракту API; список совпадает с вузами в бота.

export interface UniversityOption {
  id: string;
  name: string;
}

export const UNIVERSITIES: UniversityOption[] = [
  { id: "bmstu", name: "МГТУ им. Н.Э. Баумана" },
  { id: "msu", name: "МГУ им. М.В. Ломоносова" },
  { id: "spbu", name: "СПбГУ" },
  { id: "mipt", name: "МФТИ" },
  { id: "hse", name: "НИУ ВШЭ" },
  { id: "mgimo", name: "МГИМО" },
  { id: "rudn", name: "РУДН" },
  { id: "mie", name: "МЭИ" },
  { id: "mifi", name: "МИФИ" },
  { id: "itmo", name: "ИТМО" },
];

export function universityName(id: string): string | undefined {
  return UNIVERSITIES.find((u) => u.id === id)?.name;
}
