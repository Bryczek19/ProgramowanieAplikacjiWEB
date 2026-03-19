import type { User } from "../types/user";

const STORAGE_KEY = "manageme_users";

const defaultUsers: User[] = [
  {
    id: "user-1",
    imie: "Jan",
    nazwisko: "Kowalski",
    rola: "admin",
  },
  {
    id: "user-2",
    imie: "Anna",
    nazwisko: "Nowak",
    rola: "developer",
  },
  {
    id: "user-3",
    imie: "Piotr",
    nazwisko: "Wiśniewski",
    rola: "devops",
  },
];

class UsersApi {
  private read(): User[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      this.write(defaultUsers);
      return defaultUsers;
    }

    try {
      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        this.write(defaultUsers);
        return defaultUsers;
      }

      return parsed;
    } catch {
      this.write(defaultUsers);
      return defaultUsers;
    }
  }

  private write(users: User[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }

  getAll(): User[] {
    return this.read();
  }

  getById(id: string): User | null {
    return this.read().find((user) => user.id === id) ?? null;
  }
}

export const usersApi = new UsersApi();