import { apiGet, apiPost } from "../../api/client";
import type { UserResponse, UserProfile } from "../../api/types";

/**
 * Пользователь/профиль — всегда реальный backend
 * (GET /api/user/:userId, POST /api/user/profile).
 */
export interface UserRepository {
  getUser(userId: number): Promise<UserResponse>;
  saveProfile(userId: number, profile: Partial<UserProfile>): Promise<UserResponse>;
}

export class RealUserRepository implements UserRepository {
  async getUser(userId: number): Promise<UserResponse> {
    return apiGet<UserResponse>(`/api/user/${encodeURIComponent(String(userId))}`);
  }

  async saveProfile(userId: number, profile: Partial<UserProfile>): Promise<UserResponse> {
    // Тело — плоское (user_id + поля профиля), как ожидает POST /api/user/profile.
    return apiPost<UserResponse>("/api/user/profile", { user_id: userId, ...profile });
  }
}

export const userRepository: UserRepository = new RealUserRepository();
