import type { Service, ServiceDetail, Task } from "./types";

const SERVICES: Service[] = [
  {
    id: "postupit_bmstu",
    title: "Поступление в Бауманку",
    description: "Сбор документов и запись на приём в приёмную комиссию",
    icon: "🎓",
  },
  { id: "income", title: "Справка о доходах", description: "Заказать и скачать справку о доходах", icon: "📄" },
  { id: "no-criminal", title: "Справка об отсутствии судимости", description: "Подача заявления онлайн", icon: "🛡️" },
  { id: "polis", title: "Замена полиса ОМС", description: "Перевыпуск полиса при смене данных", icon: "🏥" },
];

const DETAILS: Record<string, ServiceDetail> = {
  postupit_bmstu: {
    ...SERVICES[0],
    steps: ["Заполните заявление", "Загрузите аттестат", "Запишитесь к терапевту", "Проверьте диплом"],
    fields: [
      { name: "lastName", label: "Фамилия", type: "text", required: true },
      { name: "firstName", label: "Имя", type: "text", required: true },
      { name: "middleName", label: "Отчество", type: "text" },
      { name: "snils", label: "СНИЛС", type: "tel", placeholder: "XXX-XXX-XXX XX", required: true },
      { name: "inn", label: "ИНН", type: "tel", placeholder: "12 цифр" },
      { name: "diploma", label: "Номер аттестата", type: "text", required: true },
      {
        name: "examType",
        label: "Форма обучения",
        type: "select",
        options: ["Очная", "Очно-заочная", "Заочная"],
        required: true,
      },
      { name: "comment", label: "Комментарий", type: "textarea", placeholder: "Пожелания по специальностям" },
    ],
  },
  income: {
    ...SERVICES[1],
    steps: ["Зайдите на gosuslugi.ru", "Откройте раздел «Доходы»", "Нажмите «Заказать справку»", "Скачайте PDF"],
    fields: [
      { name: "lastName", label: "Фамилия", type: "text", required: true },
      { name: "firstName", label: "Имя", type: "text", required: true },
      { name: "snils", label: "СНИЛС", type: "tel", placeholder: "XXX-XXX-XXX XX", required: true },
      { name: "period", label: "Период", type: "select", options: ["Год", "Полгода", "Квартал"], required: true },
    ],
  },
  "no-criminal": {
    ...SERVICES[2],
    steps: ["Зайдите на gosuslugi.ru", "Откройте раздел «Справки»", "Выберите «Об отсутствии судимости»", "Отправьте заявление"],
    fields: [
      { name: "lastName", label: "Фамилия", type: "text", required: true },
      { name: "firstName", label: "Имя", type: "text", required: true },
      { name: "birthDate", label: "Дата рождения", type: "tel", placeholder: "ДД.ММ.ГГГГ", required: true },
    ],
  },
  polis: {
    ...SERVICES[3],
    steps: ["Подайте заявление", "Дождитесь готовности полиса", "Заберите в страховой компании"],
    fields: [
      { name: "lastName", label: "Фамилия", type: "text", required: true },
      { name: "firstName", label: "Имя", type: "text", required: true },
      { name: "snils", label: "СНИЛС", type: "tel", placeholder: "XXX-XXX-XXX XX", required: true },
    ],
  },
};

const tasks = new Map<string, Task>();

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function mockServices(): Service[] {
  return SERVICES;
}

export function mockServiceDetails(): Record<string, ServiceDetail> {
  return DETAILS;
}

export async function mockTask(serviceId: string, formData: Record<string, unknown>): Promise<Task> {
  await delay(400);
  const id = `mock-${Date.now()}`;
  const detail = DETAILS[serviceId];
  const task: Task = {
    id,
    serviceId,
    status: "running",
    progress: 0,
    actions: (detail?.steps || ["Обработка заявки"]).map((title, i) => ({
      id: `a${i}`,
      title,
      status: i === 0 ? "active" : "pending",
      needsUser: i === 0,
      link: i === 0 ? "https://www.gosuslugi.ru/" : undefined,
    })),
    resultMessage: `Заявка принята. Форма: ${JSON.stringify(formData).slice(0, 120)}`,
  };
  tasks.set(id, task);
  return task;
}

export async function updateMockTask(id: string, actionId?: string): Promise<Task> {
  await delay(300);
  const task = tasks.get(id);
  if (!task) throw new Error("Задача не найдена");
  if (actionId) {
    task.actions = task.actions.map((a) => (a.id === actionId ? { ...a, status: "done", needsUser: false } : a));
  }
  const nextActive = task.actions.find((a) => a.status === "active");
  if (nextActive && !actionId) {
    const idx = task.actions.indexOf(nextActive);
    task.actions[idx] = { ...nextActive, status: "done", needsUser: false };
    const following = task.actions.find((a) => a.status === "pending");
    if (following) {
      following.status = "active";
      following.needsUser = true;
      following.link = "https://www.gosuslugi.ru/";
    }
  }
  const done = task.actions.filter((a) => a.status === "done").length;
  task.progress = Math.round((done / task.actions.length) * 100);
  if (done === task.actions.length) {
    task.status = "success";
    task.resultMessage = "Готово! Документы собраны";
  }
  task.actions = task.actions.map((a) => ({ ...a }));
  tasks.set(id, task);
  return { ...task, actions: [...task.actions] };
}
