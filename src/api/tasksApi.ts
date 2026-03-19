import type { Task, TaskInput } from "../types/task";

const STORAGE_KEY = "manageme_tasks";

class TasksApi {
  private read(): Task[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private write(tasks: Task[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  getAll(): Task[] {
    return this.read();
  }

  getById(id: string): Task | null {
    return this.read().find((task) => task.id === id) ?? null;
  }

  getByStoryId(historyjkaId: string): Task[] {
    return this.read().filter((task) => task.historyjkaId === historyjkaId);
  }

  getByStoryIds(historyjkaIds: string[]): Task[] {
    return this.read().filter((task) =>
      historyjkaIds.includes(task.historyjkaId)
    );
  }

  create(data: TaskInput): Task {
    const newTask: Task = {
      id: crypto.randomUUID(),
      dataDodania: new Date().toISOString(),
      ...data,
    };

    const tasks = this.read();
    tasks.push(newTask);
    this.write(tasks);

    return newTask;
  }

  update(id: string, data: TaskInput): Task | null {
    const tasks = this.read();
    const index = tasks.findIndex((task) => task.id === id);

    if (index === -1) return null;

    const updatedTask: Task = {
      ...tasks[index],
      ...data,
    };

    tasks[index] = updatedTask;
    this.write(tasks);

    return updatedTask;
  }

  delete(id: string): void {
    const tasks = this.read().filter((task) => task.id !== id);
    this.write(tasks);
  }

  deleteByStoryId(historyjkaId: string): void {
    const tasks = this.read().filter((task) => task.historyjkaId !== historyjkaId);
    this.write(tasks);
  }

  deleteByStoryIds(historyjkaIds: string[]): void {
    const tasks = this.read().filter(
      (task) => !historyjkaIds.includes(task.historyjkaId)
    );
    this.write(tasks);
  }
}

export const tasksApi = new TasksApi();