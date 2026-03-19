export type UserRole = "admin" | "devops" | "developer";

export interface User {
  id: string;
  imie: string;
  nazwisko: string;
  rola: UserRole;
}