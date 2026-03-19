import type { StoryPriority, StoryStatus } from "./story";

export type TaskStatus = StoryStatus;

export interface Task {
  id: string;
  nazwa: string;
  opis: string;
  priorytet: StoryPriority;
  historyjkaId: string;
  przewidywanyCzas: number;
  stan: TaskStatus;
  dataDodania: string;
  dataStartu: string | null;
  dataZakonczenia: string | null;
  uzytkownikId: string | null;
  zrealizowaneRoboczogodziny: number;
}

export type TaskInput = Omit<Task, "id" | "dataDodania">;