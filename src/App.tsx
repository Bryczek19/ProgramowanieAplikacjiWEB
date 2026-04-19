import { useEffect, useMemo, useState } from "react";
import { currentUserApi } from "./api/currentUserApi";
import { notificationsApi } from "./api/notificationsApi";
import { projectsApi } from "./api/projectsApi";
import { storiesApi } from "./api/storiesApi";
import { tasksApi } from "./api/tasksApi";
import { usersApi } from "./api/usersApi";
import type { AppNotification, NotificationPriority } from "./types/notification";
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
  const getInitialTheme = (): "light" | "dark" => {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

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

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [popupNotification, setPopupNotification] = useState<AppNotification | null>(null);

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

  const unreadNotificationsCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const todoStories = stories.filter((story) => story.stan === "todo");
  const doingStories = stories.filter((story) => story.stan === "doing");
  const doneStories = stories.filter((story) => story.stan === "done");

  const todoTasks = tasks.filter((task) => task.stan === "todo");
  const doingTasks = tasks.filter((task) => task.stan === "doing");
  const doneTasks = tasks.filter((task) => task.stan === "done");

  const loadUsers = () => {
    setUsers(usersApi.getAll());
  };

  const loadProjects = () => {
    const data = projectsApi.getAll();
    setProjects(data);
    setIsProjectsLoaded(true);
  };

  const loadNotifications = () => {
    setNotifications(notificationsApi.getAll());
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
    const projectTasks = storyIds.length > 0 ? tasksApi.getByStoryIds(storyIds) : [];

    setTasks(projectTasks);

    if (selectedTaskId && !projectTasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(null);
    }
  };

  useEffect(() => {
    loadUsers();
    loadProjects();
    loadNotifications();
  }, []);

  useEffect(() => {
    if (isProjectsLoaded) {
      loadProjectData(activeProjectId);
    }
  }, [activeProjectId, isProjectsLoaded]);

  useEffect(() => {
    if (!isProjectsLoaded) return;

    if (activeProjectId && !projects.some((project) => project.id === activeProjectId)) {
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

  const getNotificationBadgeClass = (priority: NotificationPriority) => {
    switch (priority) {
      case "high":
        return "text-bg-danger";
      case "medium":
        return "text-bg-warning";
      default:
        return "text-bg-secondary";
    }
  };

  const getUserAvatarGradient = (role: User["rola"]) => {
    if (role === "admin") {
      return "linear-gradient(180deg, #3b82f6, #1d4ed8)";
    }

    if (role === "developer") {
      return "linear-gradient(180deg, #8b5cf6, #6d28d9)";
    }

    return "linear-gradient(180deg, #f59e0b, #d97706)";
  };

  const createNotification = (
    title: string,
    message: string,
    priority: NotificationPriority = "low"
  ) => {
    const newNotification = notificationsApi.create({
      title,
      message,
      priority,
    });

    loadNotifications();

    if (priority === "medium" || priority === "high") {
      setPopupNotification(newNotification);
    }
  };

  const handleOpenNotifications = () => {
    setShowNotifications((prev) => !prev);
  };

  const handleMarkNotificationRead = (id: string) => {
    notificationsApi.markAsRead(id);
    loadNotifications();
  };

  const handleMarkAllNotificationsRead = () => {
    notificationsApi.markAllAsRead();
    loadNotifications();
  };

  const handleDeleteNotification = (id: string) => {
    notificationsApi.delete(id);
    loadNotifications();
  };

  const handleClearNotifications = () => {
    const confirmed = window.confirm("Na pewno usunąć wszystkie powiadomienia?");
    if (!confirmed) return;

    notificationsApi.clearAll();
    loadNotifications();
  };

  const handleClosePopup = () => {
    if (popupNotification) {
      notificationsApi.markAsRead(popupNotification.id);
      loadNotifications();
    }

    setPopupNotification(null);
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
      createNotification(
        "Zaktualizowano projekt",
        `Projekt "${payload.nazwa}" został zaktualizowany.`,
        "medium"
      );
    } else {
      projectsApi.create(payload);
      createNotification(
        "Dodano projekt",
        `Projekt "${payload.nazwa}" został utworzony.`,
        "medium"
      );
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
      createNotification(
        "Zaktualizowano historyjkę",
        `Historyjka "${payload.nazwa}" została zaktualizowana.`,
        "low"
      );
    } else {
      storiesApi.create(payload);
      createNotification(
        "Dodano historyjkę",
        `Historyjka "${payload.nazwa}" została dodana do projektu.`,
        "low"
      );
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
      createNotification(
        "Zaktualizowano zadanie",
        `Zadanie "${payload.nazwa}" zostało zaktualizowane.`,
        "low"
      );

      syncStoryStatusFromTasks(oldStoryId);
      if (oldStoryId !== payload.historyjkaId) {
        syncStoryStatusFromTasks(payload.historyjkaId);
      }
    } else {
      tasksApi.create(payload);
      createNotification(
        "Dodano zadanie",
        `Zadanie "${payload.nazwa}" zostało utworzone.`,
        "medium"
      );
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

    createNotification("Usunięto projekt", "Projekt został usunięty.", "high");

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

    createNotification(
      "Usunięto historyjkę",
      "Wybrana historyjka została usunięta.",
      "medium"
    );

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

    createNotification(
      "Usunięto zadanie",
      "Wybrane zadanie zostało usunięte.",
      "medium"
    );

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

    createNotification(
      "Przypisano użytkownika",
      `Do zadania "${selectedTask.nazwa}" przypisano ${getUserName(detailAssigneeId)}.`,
      "high"
    );

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

    createNotification(
      "Zadanie zakończone",
      `Zadanie "${selectedTask.nazwa}" zostało oznaczone jako done.`,
      "high"
    );

    syncStoryStatusFromTasks(selectedTask.historyjkaId);
    loadProjectData(activeProjectId);
    setSelectedTaskId(selectedTask.id);
  };

  return (
    <div className="app-shell py-4">
      <div className="container">
        <header className="card card-custom shadow-sm mb-4">
          <div className="card-body d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3">
            <div>
              <h1 className="h2 mb-1">
                <span
                  style={{
                    color: "#7fb2ff",
                    textShadow: "0 0 18px rgba(59,130,246,0.35)",
                  }}
                >
                  ManageMe
                </span>
              </h1>
              <p className="mb-0 text-secondary">
                Zalogowany użytkownik:{" "}
                <strong>
                  {currentUser.imie} {currentUser.nazwisko}
                </strong>{" "}
                ({currentUser.rola})
              </p>
            </div>

            <div className="d-flex flex-column flex-sm-row gap-2 align-items-sm-center">
              <button
                type="button"
                className="btn btn-outline-dark position-relative"
                onClick={handleOpenNotifications}
              >
                🔔 Powiadomienia
                {unreadNotificationsCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-danger">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              <div className="badge text-bg-primary fs-6 p-2">
                Aktywny projekt: {activeProject ? activeProject.nazwa : "brak"}
              </div>

              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={toggleTheme}
              >
                {theme === "light" ? "🌙 Tryb ciemny" : "☀️ Tryb jasny"}
              </button>
            </div>
          </div>
        </header>

        {showNotifications && (
          <section className="card card-custom shadow-sm mb-4">
            <div className="card-body">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mb-3">
                <h2 className="h4 mb-0 d-flex align-items-center gap-2">
                  <span style={{ color: "#fbbf24" }}>🔔</span>
                  <span>Powiadomienia</span>
                </h2>

                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={handleMarkAllNotificationsRead}
                  >
                    Oznacz wszystkie jako przeczytane
                  </button>

                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={handleClearNotifications}
                  >
                    Usuń wszystkie
                  </button>
                </div>
              </div>

              {notifications.length === 0 ? (
                <p className="text-secondary mb-0">Brak powiadomień.</p>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {notifications.map((item) => (
                    <article
                      key={item.id}
                      className={`card border ${item.read ? "" : "border-primary border-2"}`}
                    >
                      <div className="card-body">
                        <div className="d-flex flex-column flex-md-row justify-content-between gap-2 mb-2">
                          <div>
                            <h3 className="h6 mb-1">{item.title}</h3>
                            <p className="mb-1">{item.message}</p>
                            <small className="text-secondary">
                              {formatDate(item.createdAt)}
                            </small>
                          </div>

                          <div className="d-flex align-items-start">
                            <span className={`badge ${getNotificationBadgeClass(item.priority)}`}>
                              {item.priority}
                            </span>
                          </div>
                        </div>

                        <div className="d-flex flex-wrap gap-2 mt-2">
                          {!item.read && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => handleMarkNotificationRead(item.id)}
                            >
                              Oznacz jako przeczytane
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteNotification(item.id)}
                          >
                            Usuń
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <section className="card card-custom shadow-sm mb-4">
          <div className="card-body">
            <h2 className="h4 mb-3">Użytkownicy (mock)</h2>

            <div className="row g-3">
              {users.map((user) => (
                <div key={user.id} className="col-12 col-md-6 col-xl-4">
                  <article className="card h-100 card-custom border">
                    <div className="card-body d-flex align-items-center gap-3">
                      <div
                        style={{
                          width: "54px",
                          height: "54px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          color: "#fff",
                          background: getUserAvatarGradient(user.rola),
                          boxShadow: "0 8px 18px rgba(0,0,0,0.25)",
                          flexShrink: 0,
                        }}
                      >
                        {user.imie[0]}
                        {user.nazwisko[0]}
                      </div>

                      <div>
                        <h3 className="h5 mb-1">
                          {user.imie} {user.nazwisko}
                        </h3>
                        <p className="mb-1">Rola: {user.rola}</p>
                      </div>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card card-custom shadow-sm mb-4">
          <div className="card-body">
            <h2 className="h4 mb-3">Projekty</h2>

            <form onSubmit={handleProjectSubmit} className="mb-4">
              <div className="mb-3">
                <label className="form-label">Nazwa projektu</label>
                <input
                  type="text"
                  name="nazwa"
                  value={projectForm.nazwa}
                  onChange={handleProjectChange}
                  placeholder="Np. System rezerwacji"
                  className="form-control"
                />
              </div>

              <div className="mb-3">
                <label className="form-label">Opis projektu</label>
                <textarea
                  name="opis"
                  value={projectForm.opis}
                  onChange={handleProjectChange}
                  placeholder="Krótki opis projektu"
                  rows={3}
                  className="form-control"
                />
              </div>

              <div className="d-flex flex-wrap gap-2 mt-2">
                <button type="submit" className="btn btn-primary">
                  {editingProjectId ? "Zapisz projekt" : "Dodaj projekt"}
                </button>

                {editingProjectId && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={resetProjectForm}
                  >
                    Anuluj edycję
                  </button>
                )}
              </div>
            </form>

            <div className="row g-3">
              {projects.length === 0 ? (
                <p className="text-secondary mb-0">Brak projektów.</p>
              ) : (
                projects.map((project) => (
                  <div key={project.id} className="col-12 col-lg-6">
                    <article
                      className={`card h-100 card-custom border ${
                        activeProjectId === project.id ? "border-primary border-2" : ""
                      }`}
                    >
                      <div className="card-body">
                        <h3 className="h5">{project.nazwa}</h3>
                        <p>{project.opis}</p>

                        <div className="d-flex flex-wrap gap-2 mt-2">
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => handleSelectProject(project.id)}
                          >
                            {activeProjectId === project.id
                              ? "Aktywny"
                              : "Ustaw jako aktywny"}
                          </button>

                          <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => handleEditProject(project)}
                          >
                            Edytuj
                          </button>

                          <button
                            type="button"
                            className="btn btn-outline-danger"
                            onClick={() => handleDeleteProject(project.id)}
                          >
                            Usuń
                          </button>
                        </div>
                      </div>
                    </article>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="card card-custom shadow-sm mb-4">
          <div className="card-body">
            <h2 className="h4 mb-3">Historyjki</h2>

            {!activeProject ? (
              <p className="text-secondary mb-0">Najpierw ustaw aktywny projekt.</p>
            ) : (
              <>
                <p className="text-secondary">
                  Pracujesz na projekcie: <strong>{activeProject.nazwa}</strong>
                </p>

                <form onSubmit={handleStorySubmit} className="mb-4">
                  <div className="mb-3">
                    <label className="form-label">Nazwa historyjki</label>
                    <input
                      type="text"
                      name="nazwa"
                      value={storyForm.nazwa}
                      onChange={handleStoryChange}
                      placeholder="Np. Logowanie użytkownika"
                      className="form-control"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Opis historyjki</label>
                    <textarea
                      name="opis"
                      value={storyForm.opis}
                      onChange={handleStoryChange}
                      placeholder="Opis funkcjonalności"
                      rows={3}
                      className="form-control"
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label">Priorytet</label>
                      <select
                        name="priorytet"
                        value={storyForm.priorytet}
                        onChange={handleStoryChange}
                        className="form-select"
                      >
                        <option value="niski">niski</option>
                        <option value="średni">średni</option>
                        <option value="wysoki">wysoki</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Stan</label>
                      <select
                        name="stan"
                        value={storyForm.stan}
                        onChange={handleStoryChange}
                        className="form-select"
                      >
                        <option value="todo">todo</option>
                        <option value="doing">doing</option>
                        <option value="done">done</option>
                      </select>
                    </div>
                  </div>

                  <div className="d-flex flex-wrap gap-2 mt-2">
                    <button type="submit" className="btn btn-primary">
                      {editingStoryId ? "Zapisz historyjkę" : "Dodaj historyjkę"}
                    </button>

                    {editingStoryId && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={resetStoryForm}
                      >
                        Anuluj edycję
                      </button>
                    )}
                  </div>
                </form>

                {stories.length === 0 ? (
                  <p className="text-secondary mb-0">Brak historyjek.</p>
                ) : (
                  <div className="row g-3">
                    <div className="col-12 col-lg-4">
                      <div className="card card-custom h-100 border">
                        <div className="card-body">
                          <h3 className="h5 mb-3 d-flex justify-content-between align-items-center">
                            <span>Todo</span>
                            <span className="badge text-bg-secondary">{todoStories.length}</span>
                          </h3>

                          {todoStories.length === 0 ? (
                            <p className="text-secondary mb-0">Brak.</p>
                          ) : (
                            <div className="d-flex flex-column gap-3">
                              {todoStories.map((story) => (
                                <article key={story.id} className="card border">
                                  <div className="card-body">
                                    <h4 className="h6">{story.nazwa}</h4>
                                    <p>{story.opis}</p>
                                    <small className="d-block">
                                      Priorytet: {story.priorytet}
                                    </small>
                                    <small className="d-block mb-2">
                                      Data: {formatDate(story.dataUtworzenia)}
                                    </small>

                                    <div className="d-flex flex-wrap gap-2 mt-2">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={() => handleEditStory(story)}
                                      >
                                        Edytuj
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => handleDeleteStory(story.id)}
                                      >
                                        Usuń
                                      </button>
                                    </div>
                                  </div>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="col-12 col-lg-4">
                      <div className="card card-custom h-100 border">
                        <div className="card-body">
                          <h3 className="h5 mb-3 d-flex justify-content-between align-items-center">
                            <span>Doing</span>
                            <span className="badge text-bg-secondary">{doingStories.length}</span>
                          </h3>

                          {doingStories.length === 0 ? (
                            <p className="text-secondary mb-0">Brak.</p>
                          ) : (
                            <div className="d-flex flex-column gap-3">
                              {doingStories.map((story) => (
                                <article key={story.id} className="card border">
                                  <div className="card-body">
                                    <h4 className="h6">{story.nazwa}</h4>
                                    <p>{story.opis}</p>
                                    <small className="d-block">
                                      Priorytet: {story.priorytet}
                                    </small>
                                    <small className="d-block mb-2">
                                      Data: {formatDate(story.dataUtworzenia)}
                                    </small>

                                    <div className="d-flex flex-wrap gap-2 mt-2">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={() => handleEditStory(story)}
                                      >
                                        Edytuj
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => handleDeleteStory(story.id)}
                                      >
                                        Usuń
                                      </button>
                                    </div>
                                  </div>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="col-12 col-lg-4">
                      <div className="card card-custom h-100 border">
                        <div className="card-body">
                          <h3 className="h5 mb-3 d-flex justify-content-between align-items-center">
                            <span>Done</span>
                            <span className="badge text-bg-secondary">{doneStories.length}</span>
                          </h3>

                          {doneStories.length === 0 ? (
                            <p className="text-secondary mb-0">Brak.</p>
                          ) : (
                            <div className="d-flex flex-column gap-3">
                              {doneStories.map((story) => (
                                <article key={story.id} className="card border">
                                  <div className="card-body">
                                    <h4 className="h6">{story.nazwa}</h4>
                                    <p>{story.opis}</p>
                                    <small className="d-block">
                                      Priorytet: {story.priorytet}
                                    </small>
                                    <small className="d-block mb-2">
                                      Data: {formatDate(story.dataUtworzenia)}
                                    </small>

                                    <div className="d-flex flex-wrap gap-2 mt-2">
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={() => handleEditStory(story)}
                                      >
                                        Edytuj
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        onClick={() => handleDeleteStory(story.id)}
                                      >
                                        Usuń
                                      </button>
                                    </div>
                                  </div>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <section className="card card-custom shadow-sm mb-4">
          <div className="card-body">
            <h2 className="h4 mb-3">Zadania</h2>

            {!activeProject ? (
              <p className="text-secondary mb-0">Najpierw ustaw aktywny projekt.</p>
            ) : stories.length === 0 ? (
              <p className="text-secondary mb-0">
                Najpierw dodaj historyjkę do aktywnego projektu.
              </p>
            ) : (
              <>
                <form onSubmit={handleTaskSubmit} className="mb-4">
                  <div className="mb-3">
                    <label className="form-label">Nazwa zadania</label>
                    <input
                      type="text"
                      name="nazwa"
                      value={taskForm.nazwa}
                      onChange={handleTaskChange}
                      placeholder="Np. Konfiguracja bazy danych"
                      className="form-control"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Opis zadania</label>
                    <textarea
                      name="opis"
                      value={taskForm.opis}
                      onChange={handleTaskChange}
                      placeholder="Opis zadania"
                      rows={3}
                      className="form-control"
                    />
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label">Priorytet</label>
                      <select
                        name="priorytet"
                        value={taskForm.priorytet}
                        onChange={handleTaskChange}
                        className="form-select"
                      >
                        <option value="niski">niski</option>
                        <option value="średni">średni</option>
                        <option value="wysoki">wysoki</option>
                      </select>
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Historyjka</label>
                      <select
                        name="historyjkaId"
                        value={taskForm.historyjkaId}
                        onChange={handleTaskChange}
                        className="form-select"
                      >
                        {stories.map((story) => (
                          <option key={story.id} value={story.id}>
                            {story.nazwa}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="row g-3 mb-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label">Przewidywany czas wykonania</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        name="przewidywanyCzas"
                        value={taskForm.przewidywanyCzas}
                        onChange={handleTaskChange}
                        placeholder="Np. 8"
                        className="form-control"
                      />
                    </div>

                    <div className="col-12 col-md-6">
                      <label className="form-label">Zrealizowane roboczogodziny</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        name="zrealizowaneRoboczogodziny"
                        value={taskForm.zrealizowaneRoboczogodziny}
                        onChange={handleTaskChange}
                        placeholder="Np. 2"
                        className="form-control"
                      />
                    </div>
                  </div>

                  <div className="d-flex flex-wrap gap-2 mt-2">
                    <button type="submit" className="btn btn-primary">
                      {editingTaskId ? "Zapisz zadanie" : "Dodaj zadanie"}
                    </button>

                    {editingTaskId && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={resetTaskForm}
                      >
                        Anuluj edycję
                      </button>
                    )}
                  </div>
                </form>

                <div className="row g-3 mb-4">
                  <div className="col-12 col-lg-4">
                    <div className="card card-custom h-100 border">
                      <div className="card-body">
                        <h3 className="h5 mb-3 d-flex justify-content-between align-items-center">
                          <span>Todo</span>
                          <span className="badge text-bg-secondary">{todoTasks.length}</span>
                        </h3>

                        {todoTasks.length === 0 ? (
                          <p className="text-secondary mb-0">Brak.</p>
                        ) : (
                          <div className="d-flex flex-column gap-3">
                            {todoTasks.map((task) => (
                              <article
                                key={task.id}
                                className={`card border ${
                                  selectedTaskId === task.id ? "border-primary border-2" : ""
                                }`}
                              >
                                <div className="card-body">
                                  <h4 className="h6">{task.nazwa}</h4>
                                  <p>{task.opis}</p>
                                  <small className="d-block">
                                    Historyjka: {getStoryName(task.historyjkaId)}
                                  </small>
                                  <small className="d-block">
                                    Priorytet: {task.priorytet}
                                  </small>
                                  <small className="d-block">
                                    Plan: {task.przewidywanyCzas} h
                                  </small>
                                  <small className="d-block mb-2">
                                    Osoba: {getUserName(task.uzytkownikId)}
                                  </small>

                                  <div className="d-flex flex-wrap gap-2 mt-2">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-primary"
                                      onClick={() => setSelectedTaskId(task.id)}
                                    >
                                      Szczegóły
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary"
                                      onClick={() => handleEditTask(task)}
                                    >
                                      Edytuj
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => handleDeleteTask(task.id)}
                                    >
                                      Usuń
                                    </button>
                                  </div>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-lg-4">
                    <div className="card card-custom h-100 border">
                      <div className="card-body">
                        <h3 className="h5 mb-3 d-flex justify-content-between align-items-center">
                          <span>Doing</span>
                          <span className="badge text-bg-secondary">{doingTasks.length}</span>
                        </h3>

                        {doingTasks.length === 0 ? (
                          <p className="text-secondary mb-0">Brak.</p>
                        ) : (
                          <div className="d-flex flex-column gap-3">
                            {doingTasks.map((task) => (
                              <article
                                key={task.id}
                                className={`card border ${
                                  selectedTaskId === task.id ? "border-primary border-2" : ""
                                }`}
                              >
                                <div className="card-body">
                                  <h4 className="h6">{task.nazwa}</h4>
                                  <p>{task.opis}</p>
                                  <small className="d-block">
                                    Historyjka: {getStoryName(task.historyjkaId)}
                                  </small>
                                  <small className="d-block">
                                    Priorytet: {task.priorytet}
                                  </small>
                                  <small className="d-block">
                                    Plan: {task.przewidywanyCzas} h
                                  </small>
                                  <small className="d-block mb-2">
                                    Osoba: {getUserName(task.uzytkownikId)}
                                  </small>

                                  <div className="d-flex flex-wrap gap-2 mt-2">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-primary"
                                      onClick={() => setSelectedTaskId(task.id)}
                                    >
                                      Szczegóły
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary"
                                      onClick={() => handleEditTask(task)}
                                    >
                                      Edytuj
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => handleDeleteTask(task.id)}
                                    >
                                      Usuń
                                    </button>
                                  </div>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-12 col-lg-4">
                    <div className="card card-custom h-100 border">
                      <div className="card-body">
                        <h3 className="h5 mb-3 d-flex justify-content-between align-items-center">
                          <span>Done</span>
                          <span className="badge text-bg-secondary">{doneTasks.length}</span>
                        </h3>

                        {doneTasks.length === 0 ? (
                          <p className="text-secondary mb-0">Brak.</p>
                        ) : (
                          <div className="d-flex flex-column gap-3">
                            {doneTasks.map((task) => (
                              <article
                                key={task.id}
                                className={`card border ${
                                  selectedTaskId === task.id ? "border-primary border-2" : ""
                                }`}
                              >
                                <div className="card-body">
                                  <h4 className="h6">{task.nazwa}</h4>
                                  <p>{task.opis}</p>
                                  <small className="d-block">
                                    Historyjka: {getStoryName(task.historyjkaId)}
                                  </small>
                                  <small className="d-block">
                                    Priorytet: {task.priorytet}
                                  </small>
                                  <small className="d-block">
                                    Plan: {task.przewidywanyCzas} h
                                  </small>
                                  <small className="d-block mb-2">
                                    Osoba: {getUserName(task.uzytkownikId)}
                                  </small>

                                  <div className="d-flex flex-wrap gap-2 mt-2">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-primary"
                                      onClick={() => setSelectedTaskId(task.id)}
                                    >
                                      Szczegóły
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary"
                                      onClick={() => handleEditTask(task)}
                                    >
                                      Edytuj
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => handleDeleteTask(task.id)}
                                    >
                                      Usuń
                                    </button>
                                  </div>
                                </div>
                              </article>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {selectedTask && (
                  <section className="card card-custom border">
                    <div className="card-body">
                      <h3 className="h5 mb-3">Szczegóły zadania</h3>

                      <div className="row g-3 mb-4">
                        <div className="col-12 col-md-6">
                          <strong>Nazwa:</strong>
                          <p className="mb-0">{selectedTask.nazwa}</p>
                        </div>

                        <div className="col-12 col-md-6">
                          <strong>Historyjka:</strong>
                          <p className="mb-0">{getStoryName(selectedTask.historyjkaId)}</p>
                        </div>

                        <div className="col-12 col-md-6">
                          <strong>Opis:</strong>
                          <p className="mb-0">{selectedTask.opis}</p>
                        </div>

                        <div className="col-12 col-md-6">
                          <strong>Priorytet:</strong>
                          <p className="mb-0">{selectedTask.priorytet}</p>
                        </div>

                        <div className="col-12 col-md-6">
                          <strong>Stan:</strong>
                          <p className="mb-0">{selectedTask.stan}</p>
                        </div>

                        <div className="col-12 col-md-6">
                          <strong>Data dodania:</strong>
                          <p className="mb-0">{formatDate(selectedTask.dataDodania)}</p>
                        </div>

                        <div className="col-12 col-md-6">
                          <strong>Data startu:</strong>
                          <p className="mb-0">{formatDate(selectedTask.dataStartu)}</p>
                        </div>

                        <div className="col-12 col-md-6">
                          <strong>Data zakończenia:</strong>
                          <p className="mb-0">{formatDate(selectedTask.dataZakonczenia)}</p>
                        </div>

                        <div className="col-12 col-md-6">
                          <strong>Przewidywany czas:</strong>
                          <p className="mb-0">{selectedTask.przewidywanyCzas} h</p>
                        </div>

                        <div className="col-12 col-md-6">
                          <strong>Przypisana osoba:</strong>
                          <p className="mb-0">{getUserName(selectedTask.uzytkownikId)}</p>
                        </div>
                      </div>

                      <div className="row g-3 mb-3">
                        <div className="col-12 col-lg-8">
                          <label className="form-label">Przypisz osobę</label>
                          <select
                            value={detailAssigneeId}
                            onChange={(e) => setDetailAssigneeId(e.target.value)}
                            className="form-select"
                          >
                            <option value="">-- wybierz --</option>
                            {assignableUsers.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.imie} {user.nazwisko} ({user.rola})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-12 col-lg-4 d-flex align-items-end">
                          <button
                            type="button"
                            className="btn btn-primary w-100"
                            onClick={handleAssignUser}
                          >
                            Przypisz i ustaw doing
                          </button>
                        </div>
                      </div>

                      <div className="row g-3 mb-3">
                        <div className="col-12 col-lg-8">
                          <label className="form-label">Zrealizowane roboczogodziny</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={detailHours}
                            onChange={(e) => setDetailHours(e.target.value)}
                            className="form-control"
                          />
                        </div>

                        <div className="col-12 col-lg-4 d-flex align-items-end">
                          <button
                            type="button"
                            className="btn btn-outline-secondary w-100"
                            onClick={handleSaveDetailHours}
                          >
                            Zapisz roboczogodziny
                          </button>
                        </div>
                      </div>

                      <div className="d-flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={handleMarkTaskDone}
                        >
                          Oznacz jako done
                        </button>
                      </div>
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </section>

        {popupNotification && (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{
              backgroundColor: "rgba(0,0,0,0.45)",
              zIndex: 1050,
            }}
          >
            <div className="card shadow" style={{ width: "100%", maxWidth: "520px" }}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h3 className="h5 mb-1">{popupNotification.title}</h3>
                    <span
                      className={`badge ${getNotificationBadgeClass(
                        popupNotification.priority
                      )}`}
                    >
                      {popupNotification.priority}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Close"
                    onClick={handleClosePopup}
                  />
                </div>

                <p>{popupNotification.message}</p>
                <small className="text-secondary d-block mb-3">
                  {formatDate(popupNotification.createdAt)}
                </small>

                <div className="d-flex justify-content-end">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleClosePopup}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;