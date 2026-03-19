import type { Project, ProjectInput } from "../types/project";

const STORAGE_KEY = "manageme_projects";

class ProjectsApi {
  private read(): Project[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch {
      return [];
    }
  }

  private write(projects: Project[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  getAll(): Project[] {
    return this.read();
  }

  getById(id: string): Project | null {
    return this.read().find((project) => project.id === id) ?? null;
  }

  create(data: ProjectInput): Project {
    const newProject: Project = {
      id: crypto.randomUUID(),
      nazwa: data.nazwa,
      opis: data.opis,
    };

    const projects = this.read();
    projects.push(newProject);
    this.write(projects);

    return newProject;
  }

  update(id: string, data: ProjectInput): Project | null {
    const projects = this.read();
    const index = projects.findIndex((project) => project.id === id);

    if (index === -1) return null;

    const updatedProject: Project = {
      ...projects[index],
      nazwa: data.nazwa,
      opis: data.opis,
    };

    projects[index] = updatedProject;
    this.write(projects);

    return updatedProject;
  }

  delete(id: string): void {
    const projects = this.read().filter((project) => project.id !== id);
    this.write(projects);
  }
}

export const projectsApi = new ProjectsApi();