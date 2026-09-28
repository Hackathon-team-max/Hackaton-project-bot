import { appMode } from "../../config/app";
import { MockUniversityRepository } from "./mock";
import { RealUniversityRepository } from "./real";
import type { UniversityRepository } from "./types";

export type { UniversityRepository };
export { MockUniversityRepository, RealUniversityRepository };

/** Фабрика по appMode: preview → localStorage, production → HTTP. */
export function createUniversityRepository(): UniversityRepository {
  return appMode === "production" ? new RealUniversityRepository() : new MockUniversityRepository();
}

export const universityRepository: UniversityRepository = createUniversityRepository();
