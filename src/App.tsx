import { useEffect, useMemo, useState } from "react";
import { currentUserApi } from "./api/currentUserApi";
import { projectsApi } from "./api/projectsApi";
import { storiesApi } from "./api/storiesApi";
import type { Project, ProjectInput } from "./types/project";
import type { Story, StoryPriority, StoryStatus } from "./types/story";
import type { User } from "./types/user";

const emptyProjectForm: ProjectInput = {
  nazwa: "",
  opis: "",
};

type StoryFormState = {
  nazwa: string;
  opis: string;
  priorytet: StoryPriority;
  stan: StoryStatus;
};

const emptyStoryForm: StoryFormState = {
  nazwa: "",
  opis: "",
  priorytet: "średni",
  stan: "todo",
};

function App() {
  const [currentUser] = useState<User>(() => currentUserApi.getCurrentUser());

  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectsLoaded, setIsProjectsLoaded] = useState(false);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    () => projectsApi.getActiveProjectId()
  );

  const [projectForm, setProjectForm] = useState<ProjectInput>(emptyProjectForm);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const [stories, setStories] = useState<Story[]>([]);
  const [storyForm, setStoryForm] = useState<StoryFormState>(emptyStoryForm);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const loadProjects = () => {
    const data = projectsApi.getAll();
    setProjects(data);
    setIsProjectsLoaded(true);
  };

  const loadStories = (projectId: string | null) => {
    if (!projectId) {
      setStories([]);
      return;
    }

    setStories(storiesApi.getByProject(projectId));
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (isProjectsLoaded) {
      loadStories(activeProjectId);
    }
  }, [activeProjectId, isProjectsLoaded]);

  useEffect(() => {
    if (!isProjectsLoaded) return;

    if (
      activeProjectId &&
      !projects.some((project) => project.id === activeProjectId)
    ) {
      projectsApi.setActiveProjectId(null);
      setActiveProjectId(null);
    }
  }, [projects, activeProjectId, isProjectsLoaded]);

  const resetProjectForm = () => {
    setProjectForm(emptyProjectForm);
    setEditingProjectId(null);
  };

  const resetStoryForm = () => {
    setStoryForm(emptyStoryForm);
    setEditingStoryId(null);
  };

  const handleProjectChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProjectForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStoryChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setStoryForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleProjectSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload: ProjectInput = {
      nazwa: projectForm.nazwa.trim(),
      opis: projectForm.opis.trim(),
    };

    if (!payload.nazwa || !payload.opis) {
      alert("Uzupełnij nazwę i opis projektu.");
      return;
    }

    if (editingProjectId) {
      projectsApi.update(editingProjectId, payload);
    } else {
      projectsApi.create(payload);
    }

    loadProjects();
    resetProjectForm();
  };

  const handleStorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!activeProjectId) {
      alert("Najpierw wybierz aktywny projekt.");
      return;
    }

    const payload = {
      nazwa: storyForm.nazwa.trim(),
      opis: storyForm.opis.trim(),
      priorytet: storyForm.priorytet,
      stan: storyForm.stan,
      projektId: activeProjectId,
      wlascicielId: currentUser.id,
    };

    if (!payload.nazwa || !payload.opis) {
      alert("Uzupełnij nazwę i opis historyjki.");
      return;
    }

    if (editingStoryId) {
      storiesApi.update(editingStoryId, payload);
    } else {
      storiesApi.create(payload);
    }

    loadStories(activeProjectId);
    resetStoryForm();
  };

  const handleSelectProject = (projectId: string) => {
    projectsApi.setActiveProjectId(projectId);
    setActiveProjectId(projectId);
    resetStoryForm();
  };

  const handleEditProject = (project: Project) => {
    setEditingProjectId(project.id);
    setProjectForm({
      nazwa: project.nazwa,
      opis: project.opis,
    });
  };

  const handleDeleteProject = (projectId: string) => {
    const confirmed = window.confirm("Na pewno usunąć projekt?");
    if (!confirmed) return;

    projectsApi.delete(projectId);
    storiesApi.deleteByProject(projectId);

    if (activeProjectId === projectId) {
      projectsApi.setActiveProjectId(null);
      setActiveProjectId(null);
      resetStoryForm();
    }

    if (editingProjectId === projectId) {
      resetProjectForm();
    }

    loadProjects();
    loadStories(projectsApi.getActiveProjectId());
  };

  const handleEditStory = (story: Story) => {
    setEditingStoryId(story.id);
    setStoryForm({
      nazwa: story.nazwa,
      opis: story.opis,
      priorytet: story.priorytet,
      stan: story.stan,
    });
  };

  const handleDeleteStory = (storyId: string) => {
    const confirmed = window.confirm("Na pewno usunąć historyjkę?");
    if (!confirmed) return;

    storiesApi.delete(storyId);

    if (editingStoryId === storyId) {
      resetStoryForm();
    }

    loadStories(activeProjectId);
  };

  const todoStories = stories.filter((story) => story.stan === "todo");
  const doingStories = stories.filter((story) => story.stan === "doing");
  const doneStories = stories.filter((story) => story.stan === "done");

  const formatDate = (date: string) => new Date(date).toLocaleString("pl-PL");

  return (
    <div className="app">
      <div className="container">
        <header className="topbar">
          <div>
            <h1>ManageMe</h1>
            <p className="subtitle">
              Zalogowany użytkownik:{" "}
              <strong>
                {currentUser.imie} {currentUser.nazwisko}
              </strong>
            </p>
          </div>

          <div className="active-box">
            <span>Aktywny projekt:</span>
            <strong>{activeProject ? activeProject.nazwa : "brak"}</strong>
          </div>
        </header>

        <section className="panel">
          <h2>Projekty</h2>

          <form className="form" onSubmit={handleProjectSubmit}>
            <label>
              Nazwa projektu
              <input
                type="text"
                name="nazwa"
                value={projectForm.nazwa}
                onChange={handleProjectChange}
                placeholder="Np. System rezerwacji"
              />
            </label>

            <label>
              Opis projektu
              <textarea
                name="opis"
                value={projectForm.opis}
                onChange={handleProjectChange}
                placeholder="Krótki opis projektu"
                rows={3}
              />
            </label>

            <div className="actions">
              <button type="submit">
                {editingProjectId ? "Zapisz projekt" : "Dodaj projekt"}
              </button>

              {editingProjectId && (
                <button
                  type="button"
                  className="secondary"
                  onClick={resetProjectForm}
                >
                  Anuluj edycję
                </button>
              )}
            </div>
          </form>

          <div className="cards">
            {projects.length === 0 ? (
              <p className="empty">Brak projektów.</p>
            ) : (
              projects.map((project) => (
                <article
                  key={project.id}
                  className={`card ${
                    activeProjectId === project.id ? "card-active" : ""
                  }`}
                >
                  <h3>{project.nazwa}</h3>
                  <p>{project.opis}</p>

                  <div className="actions">
                    <button
                      type="button"
                      onClick={() => handleSelectProject(project.id)}
                    >
                      {activeProjectId === project.id
                        ? "Aktywny"
                        : "Ustaw jako aktywny"}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => handleEditProject(project)}
                    >
                      Edytuj
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDeleteProject(project.id)}
                    >
                      Usuń
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Historyjki</h2>

          {!activeProject ? (
            <p className="empty">Najpierw ustaw aktywny projekt.</p>
          ) : (
            <>
              <p className="subtitle">
                Pracujesz na projekcie: <strong>{activeProject.nazwa}</strong>
              </p>

              <form className="form" onSubmit={handleStorySubmit}>
                <label>
                  Nazwa historyjki
                  <input
                    type="text"
                    name="nazwa"
                    value={storyForm.nazwa}
                    onChange={handleStoryChange}
                    placeholder="Np. Dodanie logowania"
                  />
                </label>

                <label>
                  Opis historyjki
                  <textarea
                    name="opis"
                    value={storyForm.opis}
                    onChange={handleStoryChange}
                    placeholder="Opis funkcjonalności"
                    rows={3}
                  />
                </label>

                <div className="grid-2">
                  <label>
                    Priorytet
                    <select
                      name="priorytet"
                      value={storyForm.priorytet}
                      onChange={handleStoryChange}
                    >
                      <option value="niski">niski</option>
                      <option value="średni">średni</option>
                      <option value="wysoki">wysoki</option>
                    </select>
                  </label>

                  <label>
                    Stan
                    <select
                      name="stan"
                      value={storyForm.stan}
                      onChange={handleStoryChange}
                    >
                      <option value="todo">todo</option>
                      <option value="doing">doing</option>
                      <option value="done">done</option>
                    </select>
                  </label>
                </div>

                <div className="actions">
                  <button type="submit">
                    {editingStoryId ? "Zapisz historyjkę" : "Dodaj historyjkę"}
                  </button>

                  {editingStoryId && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={resetStoryForm}
                    >
                      Anuluj edycję
                    </button>
                  )}
                </div>
              </form>

              <div className="story-columns">
                <div className="story-column">
                  <h3>Todo</h3>
                  {todoStories.length === 0 ? (
                    <p className="empty">Brak.</p>
                  ) : (
                    todoStories.map((story) => (
                      <article key={story.id} className="story-card">
                        <h4>{story.nazwa}</h4>
                        <p>{story.opis}</p>
                        <small>Priorytet: {story.priorytet}</small>
                        <small>Data: {formatDate(story.dataUtworzenia)}</small>
                        <small>
                          Właściciel: {currentUser.imie} {currentUser.nazwisko}
                        </small>

                        <div className="actions">
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => handleEditStory(story)}
                          >
                            Edytuj
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleDeleteStory(story.id)}
                          >
                            Usuń
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>

                <div className="story-column">
                  <h3>Doing</h3>
                  {doingStories.length === 0 ? (
                    <p className="empty">Brak.</p>
                  ) : (
                    doingStories.map((story) => (
                      <article key={story.id} className="story-card">
                        <h4>{story.nazwa}</h4>
                        <p>{story.opis}</p>
                        <small>Priorytet: {story.priorytet}</small>
                        <small>Data: {formatDate(story.dataUtworzenia)}</small>
                        <small>
                          Właściciel: {currentUser.imie} {currentUser.nazwisko}
                        </small>

                        <div className="actions">
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => handleEditStory(story)}
                          >
                            Edytuj
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleDeleteStory(story.id)}
                          >
                            Usuń
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>

                <div className="story-column">
                  <h3>Done</h3>
                  {doneStories.length === 0 ? (
                    <p className="empty">Brak.</p>
                  ) : (
                    doneStories.map((story) => (
                      <article key={story.id} className="story-card">
                        <h4>{story.nazwa}</h4>
                        <p>{story.opis}</p>
                        <small>Priorytet: {story.priorytet}</small>
                        <small>Data: {formatDate(story.dataUtworzenia)}</small>
                        <small>
                          Właściciel: {currentUser.imie} {currentUser.nazwisko}
                        </small>

                        <div className="actions">
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => handleEditStory(story)}
                          >
                            Edytuj
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleDeleteStory(story.id)}
                          >
                            Usuń
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;