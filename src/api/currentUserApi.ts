import { usersApi } from "./usersApi";
import type { User } from "../types/user";

const STORAGE_KEY = "manageme_current_user_id";

class CurrentUserApi {
  getCurrentUser(): User {
    const users = usersApi.getAll();

    const adminUser =
      users.find((user) => user.rola === "admin") ?? users[0];

    const storedUserId = localStorage.getItem(STORAGE_KEY);
    const storedUser = users.find((user) => user.id === storedUserId);

    if (storedUser) {
      return storedUser;
    }

    localStorage.setItem(STORAGE_KEY, adminUser.id);
    return adminUser;
  }
}

export const currentUserApi = new CurrentUserApi();