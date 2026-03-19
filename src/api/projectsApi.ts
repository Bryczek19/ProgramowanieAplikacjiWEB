import type { Project, ProjectInput } from "../types/project";

const STORAGE_KEY = "manageme_projects";
const ACTIVE_PROJECT_KEY = "manageme_active_project_id";

class ProjectsApi {
  private read(): Project[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
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

    const activeId = this.getActiveProjectId();
    if (activeId === id) {
      this.setActiveProjectId(null);
    }
  }

  getActiveProjectId(): string | null {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  }

  setActiveProjectId(id: string | null): void {
    if (id) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_PROJECT_KEY);
    }
  }

  getActiveProject(): Project | null {
    const activeId = this.getActiveProjectId();
    if (!activeId) return null;

    return this.getById(activeId);
  }
}

export const projectsApi = new ProjectsApi();