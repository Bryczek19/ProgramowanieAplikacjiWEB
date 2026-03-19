import type { User } from "../types/user";

const STORAGE_KEY = "manageme_current_user";

const defaultUser: User = {
  id: "user-1",
  imie: "Jan",
  nazwisko: "Kowalski",
};

class CurrentUserApi {
  getCurrentUser(): User {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUser));
      return defaultUser;
    }

    try {
      return JSON.parse(raw) as User;
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUser));
      return defaultUser;
    }
  }
}

export const currentUserApi = new CurrentUserApi();