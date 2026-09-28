export type AppMode = "preview" | "production";

// Единственное место, где читается VITE_APP_MODE.
// Остальной код выбирает реализации через repository layer.
export const appMode: AppMode =
  import.meta.env.VITE_APP_MODE === "production" ? "production" : "preview";

export const isPreview = appMode === "preview";
