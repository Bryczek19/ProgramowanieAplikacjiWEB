export type StoryPriority = "niski" | "średni" | "wysoki";
export type StoryStatus = "todo" | "doing" | "done";

export interface Story {
  id: string;
  nazwa: string;
  opis: string;
  priorytet: StoryPriority;
  projektId: string;
  dataUtworzenia: string;
  stan: StoryStatus;
  wlascicielId: string;
}

export type StoryInput = Omit<Story, "id" | "dataUtworzenia">;