export interface Project {
  id: string;
  nazwa: string;
  opis: string;
}

export type ProjectInput = Omit<Project, "id">;