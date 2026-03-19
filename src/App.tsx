import { useEffect, useState } from "react";
import { projectsApi } from "./api/projectsApi";
import type { Project, ProjectInput } from "./types/project";

const emptyForm: ProjectInput = {
  nazwa: "",
  opis: "",
};

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [form, setForm] = useState<ProjectInput>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadProjects = () => {
    setProjects(projectsApi.getAll());
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev: ProjectInput) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nazwa = form.nazwa.trim();
    const opis = form.opis.trim();

    if (!nazwa || !opis) {
      alert("Uzupełnij nazwę i opis projektu.");
      return;
    }

    const payload: ProjectInput = { nazwa, opis };

    if (editingId) {
      projectsApi.update(editingId, payload);
    } else {
      projectsApi.create(payload);
    }

    loadProjects();
    resetForm();
  };

  const handleEdit = (project: Project) => {
    setEditingId(project.id);
    setForm({
      nazwa: project.nazwa,
      opis: project.opis,
    });
  };

  const handleDelete = (id: string) => {
    const confirmed = window.confirm("Na pewno usunąć ten projekt?");
    if (!confirmed) return;

    projectsApi.delete(id);

    if (editingId === id) {
      resetForm();
    }

    loadProjects();
  };

  return (
    <div className="app">
      <div className="container">
        <h1>ManageMe - Projekty</h1>

        <form className="project-form" onSubmit={handleSubmit}>
          <h2>{editingId ? "Edycja projektu" : "Dodaj projekt"}</h2>

          <label>
            Nazwa projektu
            <input
              type="text"
              name="nazwa"
              value={form.nazwa}
              onChange={handleChange}
              placeholder="Np. System rezerwacji"
            />
          </label>

          <label>
            Opis projektu
            <textarea
              name="opis"
              value={form.opis}
              onChange={handleChange}
              placeholder="Krótki opis projektu"
              rows={4}
            />
          </label>

          <div className="form-actions">
            <button type="submit">
              {editingId ? "Zapisz zmiany" : "Dodaj projekt"}
            </button>

            {editingId && (
              <button type="button" className="secondary" onClick={resetForm}>
                Anuluj
              </button>
            )}
          </div>
        </form>

        <section className="projects-list">
          <h2>Lista projektów</h2>

          {projects.length === 0 ? (
            <p className="empty">Brak projektów.</p>
          ) : (
            <div className="cards">
              {projects.map((project) => (
                <article key={project.id} className="card">
                  <h3>{project.nazwa}</h3>
                  <p>{project.opis}</p>

                  <div className="card-actions">
                    <button type="button" onClick={() => handleEdit(project)}>
                      Edytuj
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDelete(project.id)}
                    >
                      Usuń
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;