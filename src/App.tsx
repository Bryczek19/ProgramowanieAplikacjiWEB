import { useEffect, useMemo, useState } from "react";
import { currentUserApi } from "./api/currentUserApi";
import { projectsApi } from "./api/projectsApi";
import { storiesApi } from "./api/storiesApi";
import { tasksApi } from "./api/tasksApi";
import { usersApi } from "./api/usersApi";
import type { Project, ProjectInput } from "./types/project";
import type { Story, StoryInput, StoryPriority, StoryStatus } from "./types/story";
import type { Task, TaskInput } from "./types/task";
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

type TaskFormState = {
  nazwa: string;
  opis: string;
  priorytet: StoryPriority;
  historyjkaId: string;
  przewidywanyCzas: string;
  zrealizowaneRoboczogodziny: string;
};

const getEmptyTaskForm = (historyjkaId = ""): TaskFormState => ({
  nazwa: "",
  opis: "",
  priorytet: "średni",
  historyjkaId,
  przewidywanyCzas: "",
  zrealizowaneRoboczogodziny: "0",
});

function App() {
  const [currentUser] = useState<User>(() => currentUserApi.getCurrentUser());
  const [users, setUsers] = useState<User[]>([]);

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

  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskForm, setTaskForm] = useState<TaskFormState>(getEmptyTaskForm());
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailAssigneeId, setDetailAssigneeId] = useState("");
  const [detailHours, setDetailHours] = useState("0");

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const assignableUsers = useMemo(
    () => users.filter((user) => user.rola === "developer" || user.rola === "devops"),
    [users]
  );

  const loadUsers = () => {
    setUsers(usersApi.getAll());
  };

  const loadProjects = () => {
    const data = projectsApi.getAll();
    setProjects(data);
    setIsProjectsLoaded(true);
  };

  const loadProjectData = (projectId: string | null) => {
    if (!projectId) {
      setStories([]);
      setTasks([]);
      setSelectedTaskId(null);
      return;
    }

    const projectStories = storiesApi.getByProject(projectId);
    setStories(projectStories);

    const storyIds = projectStories.map((story) => story.id);
    const projectTasks =
      storyIds.length > 0 ? tasksApi.getByStoryIds(storyIds) : [];

    setTasks(projectTasks);

    if (
      selectedTaskId &&
      !projectTasks.some((task) => task.id === selectedTaskId)
    ) {
      setSelectedTaskId(null);
    }
  };

  useEffect(() => {
    loadUsers();
    loadProjects();
  }, []);

  useEffect(() => {
    if (isProjectsLoaded) {
      loadProjectData(activeProjectId);
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

  useEffect(() => {
    if (editingTaskId) return;

    if (stories.length === 0) {
      setTaskForm(getEmptyTaskForm());
      return;
    }

    if (!stories.some((story) => story.id === taskForm.historyjkaId)) {
      setTaskForm(getEmptyTaskForm(stories[0].id));
    }
  }, [stories, editingTaskId, taskForm.historyjkaId]);

  useEffect(() => {
    if (!selectedTask) {
      setDetailAssigneeId("");
      setDetailHours("0");
      return;
    }

    setDetailAssigneeId(selectedTask.uzytkownikId ?? "");
    setDetailHours(String(selectedTask.zrealizowaneRoboczogodziny));
  }, [selectedTask]);

  const resetProjectForm = () => {
    setProjectForm(emptyProjectForm);
    setEditingProjectId(null);
  };

  const resetStoryForm = () => {
    setStoryForm(emptyStoryForm);
    setEditingStoryId(null);
  };

  const resetTaskForm = () => {
    const defaultStoryId = stories[0]?.id ?? "";
    setTaskForm(getEmptyTaskForm(defaultStoryId));
    setEditingTaskId(null);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("pl-PL");
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return "nie przypisano";

    const user = users.find((item) => item.id === userId);
    if (!user) return "nie przypisano";

    return `${user.imie} ${user.nazwisko}`;
  };

  const getStoryName = (storyId: string) => {
    const story = stories.find((item) => item.id === storyId);
    return story ? story.nazwa : "-";
  };

  const syncStoryStatusFromTasks = (storyId: string) => {
    const story = stories.find((item) => item.id === storyId);

    if (!story) return;

    const storyTasks = tasksApi.getByStoryId(storyId);

    if (storyTasks.length === 0) return;

    let nextState: StoryStatus = story.stan;

    if (storyTasks.every((task) => task.stan === "done")) {
      nextState = "done";
    } else if (
      storyTasks.some((task) => task.stan === "doing" || task.stan === "done") &&
      story.stan === "todo"
    ) {
      nextState = "doing";
    }

    if (nextState !== story.stan) {
      const payload: StoryInput = {
        nazwa: story.nazwa,
        opis: story.opis,
        priorytet: story.priorytet,
        projektId: story.projektId,
        stan: nextState,
        wlascicielId: story.wlascicielId,
      };

      storiesApi.update(story.id, payload);
    }
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setStoryForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTaskChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setTaskForm((prev) => ({
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

    const payload: StoryInput = {
      nazwa: storyForm.nazwa.trim(),
      opis: storyForm.opis.trim(),
      priorytet: storyForm.priorytet,
      projektId: activeProjectId,
      stan: storyForm.stan,
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

    loadProjectData(activeProjectId);
    resetStoryForm();
  };

  const handleTaskSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!activeProjectId) {
      alert("Najpierw wybierz aktywny projekt.");
      return;
    }

    if (stories.length === 0) {
      alert("Najpierw dodaj historyjkę.");
      return;
    }

    const nazwa = taskForm.nazwa.trim();
    const opis = taskForm.opis.trim();
    const przewidywanyCzas = Number(taskForm.przewidywanyCzas);
    const zrealizowaneRoboczogodziny = Number(taskForm.zrealizowaneRoboczogodziny);

    if (!nazwa || !opis) {
      alert("Uzupełnij nazwę i opis zadania.");
      return;
    }

    if (!taskForm.historyjkaId) {
      alert("Wybierz historyjkę.");
      return;
    }

    if (
      Number.isNaN(przewidywanyCzas) ||
      przewidywanyCzas < 0 ||
      Number.isNaN(zrealizowaneRoboczogodziny) ||
      zrealizowaneRoboczogodziny < 0
    ) {
      alert("Czas musi być liczbą większą lub równą 0.");
      return;
    }

    const existingTask =
      editingTaskId ? tasks.find((task) => task.id === editingTaskId) ?? null : null;

    const payload: TaskInput = {
      nazwa,
      opis,
      priorytet: taskForm.priorytet,
      historyjkaId: taskForm.historyjkaId,
      przewidywanyCzas,
      stan: existingTask?.stan ?? "todo",
      dataStartu: existingTask?.dataStartu ?? null,
      dataZakonczenia: existingTask?.dataZakonczenia ?? null,
      uzytkownikId: existingTask?.uzytkownikId ?? null,
      zrealizowaneRoboczogodziny,
    };

    if (editingTaskId && existingTask) {
      const oldStoryId = existingTask.historyjkaId;

      tasksApi.update(editingTaskId, payload);

      syncStoryStatusFromTasks(oldStoryId);
      if (oldStoryId !== payload.historyjkaId) {
        syncStoryStatusFromTasks(payload.historyjkaId);
      }
    } else {
      tasksApi.create(payload);
    }

    loadProjectData(activeProjectId);
    resetTaskForm();
  };

  const handleSelectProject = (projectId: string) => {
    projectsApi.setActiveProjectId(projectId);
    setActiveProjectId(projectId);
    resetStoryForm();
    setSelectedTaskId(null);
    setEditingTaskId(null);
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

    const projectStories = storiesApi.getByProject(projectId);
    const storyIds = projectStories.map((story) => story.id);

    tasksApi.deleteByStoryIds(storyIds);
    storiesApi.deleteByProject(projectId);
    projectsApi.delete(projectId);

    if (activeProjectId === projectId) {
      projectsApi.setActiveProjectId(null);
      setActiveProjectId(null);
      setSelectedTaskId(null);
    }

    if (editingProjectId === projectId) {
      resetProjectForm();
    }

    loadProjects();
    loadProjectData(projectsApi.getActiveProjectId());
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

    tasksApi.deleteByStoryId(storyId);
    storiesApi.delete(storyId);

    if (editingStoryId === storyId) {
      resetStoryForm();
    }

    loadProjectData(activeProjectId);
  };

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setSelectedTaskId(task.id);
    setTaskForm({
      nazwa: task.nazwa,
      opis: task.opis,
      priorytet: task.priorytet,
      historyjkaId: task.historyjkaId,
      przewidywanyCzas: String(task.przewidywanyCzas),
      zrealizowaneRoboczogodziny: String(task.zrealizowaneRoboczogodziny),
    });
  };

  const handleDeleteTask = (taskId: string) => {
    const confirmed = window.confirm("Na pewno usunąć zadanie?");
    if (!confirmed) return;

    const task = tasks.find((item) => item.id === taskId);

    tasksApi.delete(taskId);

    if (editingTaskId === taskId) {
      resetTaskForm();
    }

    if (selectedTaskId === taskId) {
      setSelectedTaskId(null);
    }

    if (task) {
      syncStoryStatusFromTasks(task.historyjkaId);
    }

    loadProjectData(activeProjectId);
  };

  const handleAssignUser = () => {
    if (!selectedTask) {
      alert("Wybierz zadanie.");
      return;
    }

    if (!detailAssigneeId) {
      alert("Wybierz użytkownika.");
      return;
    }

    if (selectedTask.stan === "done") {
      alert("Nie można przypisać osoby do zakończonego zadania.");
      return;
    }

    const now = new Date().toISOString();

    const payload: TaskInput = {
      nazwa: selectedTask.nazwa,
      opis: selectedTask.opis,
      priorytet: selectedTask.priorytet,
      historyjkaId: selectedTask.historyjkaId,
      przewidywanyCzas: selectedTask.przewidywanyCzas,
      stan: "doing",
      dataStartu: selectedTask.dataStartu ?? now,
      dataZakonczenia: null,
      uzytkownikId: detailAssigneeId,
      zrealizowaneRoboczogodziny: selectedTask.zrealizowaneRoboczogodziny,
    };

    tasksApi.update(selectedTask.id, payload);
    syncStoryStatusFromTasks(selectedTask.historyjkaId);
    loadProjectData(activeProjectId);
    setSelectedTaskId(selectedTask.id);
  };

  const handleSaveDetailHours = () => {
    if (!selectedTask) {
      alert("Wybierz zadanie.");
      return;
    }

    const hours = Number(detailHours);

    if (Number.isNaN(hours) || hours < 0) {
      alert("Roboczogodziny muszą być liczbą większą lub równą 0.");
      return;
    }

    const payload: TaskInput = {
      nazwa: selectedTask.nazwa,
      opis: selectedTask.opis,
      priorytet: selectedTask.priorytet,
      historyjkaId: selectedTask.historyjkaId,
      przewidywanyCzas: selectedTask.przewidywanyCzas,
      stan: selectedTask.stan,
      dataStartu: selectedTask.dataStartu,
      dataZakonczenia: selectedTask.dataZakonczenia,
      uzytkownikId: selectedTask.uzytkownikId,
      zrealizowaneRoboczogodziny: hours,
    };

    tasksApi.update(selectedTask.id, payload);
    loadProjectData(activeProjectId);
    setSelectedTaskId(selectedTask.id);
  };

  const handleMarkTaskDone = () => {
    if (!selectedTask) {
      alert("Wybierz zadanie.");
      return;
    }

    if (!selectedTask.uzytkownikId) {
      alert("Najpierw przypisz użytkownika do zadania.");
      return;
    }

    const now = new Date().toISOString();

    const payload: TaskInput = {
      nazwa: selectedTask.nazwa,
      opis: selectedTask.opis,
      priorytet: selectedTask.priorytet,
      historyjkaId: selectedTask.historyjkaId,
      przewidywanyCzas: selectedTask.przewidywanyCzas,
      stan: "done",
      dataStartu: selectedTask.dataStartu ?? now,
      dataZakonczenia: now,
      uzytkownikId: selectedTask.uzytkownikId,
      zrealizowaneRoboczogodziny: selectedTask.zrealizowaneRoboczogodziny,
    };

    tasksApi.update(selectedTask.id, payload);
    syncStoryStatusFromTasks(selectedTask.historyjkaId);
    loadProjectData(activeProjectId);
    setSelectedTaskId(selectedTask.id);
  };

  const todoStories = stories.filter((story) => story.stan === "todo");
  const doingStories = stories.filter((story) => story.stan === "doing");
  const doneStories = stories.filter((story) => story.stan === "done");

  const todoTasks = tasks.filter((task) => task.stan === "todo");
  const doingTasks = tasks.filter((task) => task.stan === "doing");
  const doneTasks = tasks.filter((task) => task.stan === "done");

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
              </strong>{" "}
              ({currentUser.rola})
            </p>
          </div>

          <div className="active-box">
            <span>Aktywny projekt:</span>
            <strong>{activeProject ? activeProject.nazwa : "brak"}</strong>
          </div>
        </header>

        <section className="panel">
          <h2>Użytkownicy (mock)</h2>

          <div className="user-grid">
            {users.map((user) => (
              <article key={user.id} className="user-card">
                <h3>
                  {user.imie} {user.nazwisko}
                </h3>
                <p>Rola: {user.rola}</p>
              </article>
            ))}
          </div>
        </section>

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
                  className={`card ${activeProjectId === project.id ? "card-active" : ""}`}
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
                    placeholder="Np. Logowanie użytkownika"
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

              {stories.length === 0 ? (
                <p className="empty">Brak historyjek.</p>
              ) : (
                <div className="kanban-columns">
                  <div className="kanban-column">
                    <h3>Todo</h3>
                    {todoStories.length === 0 ? (
                      <p className="empty">Brak.</p>
                    ) : (
                      todoStories.map((story) => (
                        <article key={story.id} className="kanban-card">
                          <h4>{story.nazwa}</h4>
                          <p>{story.opis}</p>
                          <small>Priorytet: {story.priorytet}</small>
                          <small>Data: {formatDate(story.dataUtworzenia)}</small>

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

                  <div className="kanban-column">
                    <h3>Doing</h3>
                    {doingStories.length === 0 ? (
                      <p className="empty">Brak.</p>
                    ) : (
                      doingStories.map((story) => (
                        <article key={story.id} className="kanban-card">
                          <h4>{story.nazwa}</h4>
                          <p>{story.opis}</p>
                          <small>Priorytet: {story.priorytet}</small>
                          <small>Data: {formatDate(story.dataUtworzenia)}</small>

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

                  <div className="kanban-column">
                    <h3>Done</h3>
                    {doneStories.length === 0 ? (
                      <p className="empty">Brak.</p>
                    ) : (
                      doneStories.map((story) => (
                        <article key={story.id} className="kanban-card">
                          <h4>{story.nazwa}</h4>
                          <p>{story.opis}</p>
                          <small>Priorytet: {story.priorytet}</small>
                          <small>Data: {formatDate(story.dataUtworzenia)}</small>

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
              )}
            </>
          )}
        </section>

        <section className="panel">
          <h2>Zadania</h2>

          {!activeProject ? (
            <p className="empty">Najpierw ustaw aktywny projekt.</p>
          ) : stories.length === 0 ? (
            <p className="empty">Najpierw dodaj historyjkę do aktywnego projektu.</p>
          ) : (
            <>
              <form className="form" onSubmit={handleTaskSubmit}>
                <label>
                  Nazwa zadania
                  <input
                    type="text"
                    name="nazwa"
                    value={taskForm.nazwa}
                    onChange={handleTaskChange}
                    placeholder="Np. Konfiguracja bazy danych"
                  />
                </label>

                <label>
                  Opis zadania
                  <textarea
                    name="opis"
                    value={taskForm.opis}
                    onChange={handleTaskChange}
                    placeholder="Opis zadania"
                    rows={3}
                  />
                </label>

                <div className="grid-2">
                  <label>
                    Priorytet
                    <select
                      name="priorytet"
                      value={taskForm.priorytet}
                      onChange={handleTaskChange}
                    >
                      <option value="niski">niski</option>
                      <option value="średni">średni</option>
                      <option value="wysoki">wysoki</option>
                    </select>
                  </label>

                  <label>
                    Historyjka
                    <select
                      name="historyjkaId"
                      value={taskForm.historyjkaId}
                      onChange={handleTaskChange}
                    >
                      {stories.map((story) => (
                        <option key={story.id} value={story.id}>
                          {story.nazwa}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid-2">
                  <label>
                    Przewidywany czas wykonania
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      name="przewidywanyCzas"
                      value={taskForm.przewidywanyCzas}
                      onChange={handleTaskChange}
                      placeholder="Np. 8"
                    />
                  </label>

                  <label>
                    Zrealizowane roboczogodziny
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      name="zrealizowaneRoboczogodziny"
                      value={taskForm.zrealizowaneRoboczogodziny}
                      onChange={handleTaskChange}
                      placeholder="Np. 2"
                    />
                  </label>
                </div>

                <div className="actions">
                  <button type="submit">
                    {editingTaskId ? "Zapisz zadanie" : "Dodaj zadanie"}
                  </button>

                  {editingTaskId && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={resetTaskForm}
                    >
                      Anuluj edycję
                    </button>
                  )}
                </div>
              </form>

              <div className="kanban-columns">
                <div className="kanban-column">
                  <h3>Todo</h3>
                  {todoTasks.length === 0 ? (
                    <p className="empty">Brak.</p>
                  ) : (
                    todoTasks.map((task) => (
                      <article
                        key={task.id}
                        className={`kanban-card ${selectedTaskId === task.id ? "selected-card" : ""}`}
                      >
                        <h4>{task.nazwa}</h4>
                        <p>{task.opis}</p>
                        <small>Historyjka: {getStoryName(task.historyjkaId)}</small>
                        <small>Priorytet: {task.priorytet}</small>
                        <small>Plan: {task.przewidywanyCzas} h</small>
                        <small>Osoba: {getUserName(task.uzytkownikId)}</small>

                        <div className="actions">
                          <button
                            type="button"
                            onClick={() => setSelectedTaskId(task.id)}
                          >
                            Szczegóły
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => handleEditTask(task)}
                          >
                            Edytuj
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            Usuń
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>

                <div className="kanban-column">
                  <h3>Doing</h3>
                  {doingTasks.length === 0 ? (
                    <p className="empty">Brak.</p>
                  ) : (
                    doingTasks.map((task) => (
                      <article
                        key={task.id}
                        className={`kanban-card ${selectedTaskId === task.id ? "selected-card" : ""}`}
                      >
                        <h4>{task.nazwa}</h4>
                        <p>{task.opis}</p>
                        <small>Historyjka: {getStoryName(task.historyjkaId)}</small>
                        <small>Priorytet: {task.priorytet}</small>
                        <small>Plan: {task.przewidywanyCzas} h</small>
                        <small>Osoba: {getUserName(task.uzytkownikId)}</small>

                        <div className="actions">
                          <button
                            type="button"
                            onClick={() => setSelectedTaskId(task.id)}
                          >
                            Szczegóły
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => handleEditTask(task)}
                          >
                            Edytuj
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            Usuń
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>

                <div className="kanban-column">
                  <h3>Done</h3>
                  {doneTasks.length === 0 ? (
                    <p className="empty">Brak.</p>
                  ) : (
                    doneTasks.map((task) => (
                      <article
                        key={task.id}
                        className={`kanban-card ${selectedTaskId === task.id ? "selected-card" : ""}`}
                      >
                        <h4>{task.nazwa}</h4>
                        <p>{task.opis}</p>
                        <small>Historyjka: {getStoryName(task.historyjkaId)}</small>
                        <small>Priorytet: {task.priorytet}</small>
                        <small>Plan: {task.przewidywanyCzas} h</small>
                        <small>Osoba: {getUserName(task.uzytkownikId)}</small>

                        <div className="actions">
                          <button
                            type="button"
                            onClick={() => setSelectedTaskId(task.id)}
                          >
                            Szczegóły
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => handleEditTask(task)}
                          >
                            Edytuj
                          </button>
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            Usuń
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>

              {selectedTask && (
                <section className="detail-panel">
                  <h3>Szczegóły zadania</h3>

                  <div className="detail-grid">
                    <div>
                      <strong>Nazwa:</strong>
                      <p>{selectedTask.nazwa}</p>
                    </div>

                    <div>
                      <strong>Historyjka:</strong>
                      <p>{getStoryName(selectedTask.historyjkaId)}</p>
                    </div>

                    <div>
                      <strong>Opis:</strong>
                      <p>{selectedTask.opis}</p>
                    </div>

                    <div>
                      <strong>Priorytet:</strong>
                      <p>{selectedTask.priorytet}</p>
                    </div>

                    <div>
                      <strong>Stan:</strong>
                      <p>{selectedTask.stan}</p>
                    </div>

                    <div>
                      <strong>Data dodania:</strong>
                      <p>{formatDate(selectedTask.dataDodania)}</p>
                    </div>

                    <div>
                      <strong>Data startu:</strong>
                      <p>{formatDate(selectedTask.dataStartu)}</p>
                    </div>

                    <div>
                      <strong>Data zakończenia:</strong>
                      <p>{formatDate(selectedTask.dataZakonczenia)}</p>
                    </div>

                    <div>
                      <strong>Przewidywany czas:</strong>
                      <p>{selectedTask.przewidywanyCzas} h</p>
                    </div>

                    <div>
                      <strong>Przypisana osoba:</strong>
                      <p>{getUserName(selectedTask.uzytkownikId)}</p>
                    </div>
                  </div>

                  <div className="detail-actions-block">
                    <label>
                      Przypisz osobę
                      <select
                        value={detailAssigneeId}
                        onChange={(e) => setDetailAssigneeId(e.target.value)}
                      >
                        <option value="">-- wybierz --</option>
                        {assignableUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.imie} {user.nazwisko} ({user.rola})
                          </option>
                        ))}
                      </select>
                    </label>

                    <button type="button" onClick={handleAssignUser}>
                      Przypisz i ustaw doing
                    </button>
                  </div>

                  <div className="detail-actions-block">
                    <label>
                      Zrealizowane roboczogodziny
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={detailHours}
                        onChange={(e) => setDetailHours(e.target.value)}
                      />
                    </label>

                    <button
                      type="button"
                      className="secondary"
                      onClick={handleSaveDetailHours}
                    >
                      Zapisz roboczogodziny
                    </button>
                  </div>

                  <div className="actions">
                    <button
                      type="button"
                      className="success"
                      onClick={handleMarkTaskDone}
                    >
                      Oznacz jako done
                    </button>
                  </div>
                </section>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default App;