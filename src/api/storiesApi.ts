import type { Story, StoryInput } from "../types/story";

const STORAGE_KEY = "manageme_stories";

class StoriesApi {
  private read(): Story[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private write(stories: Story[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
  }

  getAll(): Story[] {
    return this.read();
  }

  getByProject(projectId: string): Story[] {
    return this.read().filter((story) => story.projektId === projectId);
  }

  create(data: StoryInput): Story {
    const newStory: Story = {
      id: crypto.randomUUID(),
      dataUtworzenia: new Date().toISOString(),
      ...data,
    };

    const stories = this.read();
    stories.push(newStory);
    this.write(stories);

    return newStory;
  }

  update(id: string, data: StoryInput): Story | null {
    const stories = this.read();
    const index = stories.findIndex((story) => story.id === id);

    if (index === -1) return null;

    const updatedStory: Story = {
      ...stories[index],
      ...data,
    };

    stories[index] = updatedStory;
    this.write(stories);

    return updatedStory;
  }

  delete(id: string): void {
    const stories = this.read().filter((story) => story.id !== id);
    this.write(stories);
  }

  deleteByProject(projectId: string): void {
    const stories = this.read().filter((story) => story.projektId !== projectId);
    this.write(stories);
  }
}

export const storiesApi = new StoriesApi();