import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../common/sidebar";
import type { ITask, IUser } from "../utils/interfaces";
import {
  canCreateTask,
  canEditTask,
  canDeleteTask,
  canUpdateTaskStatus,
  canAssignEmployees,
} from "../utils/permissions";
import { apiDownload, apiUpload, apiPut } from "../utils/api";
import { useToast } from "../components/ToastProvider";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import "./task.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

type BackendTask = {
  taskId: number;
  title: string;
  description: string;
  status: "PENDING" | "TO_DO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  startDate: string | null;
  dueDate: string;
  categoryName: string | null;
  createdByUsername: string | null;
  assigneeCount: number;
  assigneeIds: number[];
  assigneeNames: string[];
  tags: string[];
  createdAt: string | null;
  updatedAt: string | null;
};

type BackendUser = {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  status: "ACTIVE" | "INACTIVE";
  avatarColor?: string | null;
  createdAt: string | null;
};

// Extended task type for form (includes tags and attachments)
interface ITaskForm
  extends Omit<ITask, "task_id" | "created_at" | "updated_at" | "is_trashed" | "attachments"> {
  tags?: string[];
  attachments?: File[]; // File objects for upload, not IAttachment objects
  assignees?: number[];
}

// Status mapping for Kanban columns
const STATUS_MAP: Record<string, string> = {
  pending: "To Do",
  "in progress": "In Progress",
  completed: "Done",
  "on hold": "To Do",
};

const REVERSE_STATUS_MAP: Record<string, ITask["status"]> = {
  "To Do": "pending",
  "In Progress": "in progress",
  Done: "completed",
};

type ViewMode = "kanban" | "list";
type SortField = "title" | "due_date" | "priority" | "assignee";
type SortDirection = "asc" | "desc";

const Tasks: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");
  const [tasks, setTasks] = useState<ITask[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ITask | null>(null);
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");
  const [keyword, setKeyword] = useState<string>("");
  const [debouncedKeyword, setDebouncedKeyword] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [exporting, setExporting] = useState<boolean>(false);

  // Debounce the keyword input by 300ms (UX requirement).
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedKeyword(keyword.trim().toLowerCase()), 300);
    return () => window.clearTimeout(id);
  }, [keyword]);

  const clearFilters = () => {
    setKeyword("");
    setFilterAssignee("all");
    setFilterCategory("all");
    setFilterTag("all");
    setFilterStatus("all");
    setFilterPriority("all");
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (debouncedKeyword) params.set("keyword", debouncedKeyword);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterPriority !== "all") params.set("priority", filterPriority.toUpperCase());
      params.set("size", "1000");
      const blob = await apiDownload(`/tasks/export?${params.toString()}`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tasks_export.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };
  const [sortField, setSortField] = useState<SortField>("due_date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [draggedTask, setDraggedTask] = useState<ITask | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Get current user from localStorage
  useEffect(() => {
    const userStr = localStorage.getItem("currentUser");
    if (userStr) {
      try {
        const user = JSON.parse(userStr) as IUser;
        setCurrentUser(user);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  const [taskTags, setTaskTags] = useState<Record<number, string[]>>({});

  const mapStatusFromBackend = (status: BackendTask["status"]): ITask["status"] => {
    switch (status) {
      case "IN_PROGRESS":
        return "in progress";
      case "DONE":
        return "completed";
      case "TO_DO":
      case "PENDING":
      default:
        return "pending";
    }
  };

  const mapPriorityFromBackend = (
    priority: BackendTask["priority"]
  ): ITask["priority"] => {
    switch (priority) {
      case "URGENT":
        return "urgent";
      case "HIGH":
        return "high";
      case "MEDIUM":
        return "medium";
      case "LOW":
      default:
        return "low";
    }
  };

  const transformBackendUser = (user: BackendUser): IUser => ({
    user_id: user.userId,
    username: user.username,
    email: user.email,
    full_name: user.fullName,
    role: user.role as IUser["role"],
    created_at: user.createdAt ?? new Date().toISOString(),
    is_active: user.status === "ACTIVE",
    avatar_color: user.avatarColor ?? undefined,
  });

  const transformBackendTask = (task: BackendTask): ITask => ({
    task_id: task.taskId,
    title: task.title,
    description: task.description ?? "",
    start_date: task.startDate ?? "",
    due_date: task.dueDate ?? "",
    completed_date: null,
    status: mapStatusFromBackend(task.status),
    priority: mapPriorityFromBackend(task.priority),
    category: task.categoryName ?? "General",
    created_at: task.createdAt ?? new Date().toISOString(),
    updated_at: task.updatedAt ?? new Date().toISOString(),
    is_trashed: false,
    tags: task.tags ?? [],
    assignee_ids: task.assigneeIds ?? [],
  });

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tasksRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/tasks`),
        fetch(`${API_BASE_URL}/api/users`),
      ]);

      if (!tasksRes.ok) {
        throw new Error("Failed to load tasks");
      }
      if (!usersRes.ok) {
        throw new Error("Failed to load users");
      }

      const tasksJson: BackendTask[] = await tasksRes.json();
      const usersJson: BackendUser[] = await usersRes.json();

      const normalizedTasks = tasksJson.map(transformBackendTask);
      const normalizedUsers = usersJson.map(transformBackendUser);

      setTasks(normalizedTasks);
      setUsers(normalizedUsers);
      setTaskTags(
        Object.fromEntries(
          normalizedTasks.map((task) => [task.task_id, task.tags || []])
        )
      );
      setError(null);
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Get all unique categories and tags
  const categories = useMemo(() => {
    const cats = new Set(tasks.map((t) => t.category));
    return Array.from(cats);
  }, [tasks]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    Object.values(taskTags).forEach((tagArray) => {
      tagArray.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags);
  }, [taskTags]);

  // Get assignees for a task
  const getTaskAssignees = (task: ITask): IUser[] => {
    if (!task.assignee_ids?.length) {
      return [];
    }
    return users.filter((u) => task.assignee_ids?.includes(u.user_id));
  };

  // Map a backend status value to the frontend status used on cards.
  const statusToFrontend = (backend: string): ITask["status"] | null => {
    switch (backend) {
      case "PENDING":
      case "TO_DO":
        return "pending";
      case "IN_PROGRESS":
        return "in progress";
      case "DONE":
        return "completed";
      default:
        return null;
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter((t) => !t.is_trashed);

    // Keyword (title + description)
    if (debouncedKeyword) {
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(debouncedKeyword) ||
          (t.description || "").toLowerCase().includes(debouncedKeyword)
      );
    }

    // Status
    if (filterStatus !== "all") {
      const fe = statusToFrontend(filterStatus);
      if (fe) filtered = filtered.filter((t) => t.status === fe);
    }

    // Priority
    if (filterPriority !== "all") {
      filtered = filtered.filter((t) => t.priority === filterPriority);
    }

    // Filter by assignee
    if (filterAssignee !== "all") {
      const userId = parseInt(filterAssignee);
      filtered = filtered.filter((t) => t.assignee_ids?.includes(userId));
    }

    // Filter by category
    if (filterCategory !== "all") {
      filtered = filtered.filter((t) => t.category === filterCategory);
    }

    // Filter by tag
    if (filterTag !== "all") {
      filtered = filtered.filter((t) =>
        taskTags[t.task_id]?.includes(filterTag)
      );
    }

    return filtered;
  }, [tasks, debouncedKeyword, filterStatus, filterPriority, filterAssignee, filterCategory, filterTag]);

  // Sort tasks for list view
  const sortedTasks = useMemo(() => {
    if (viewMode !== "list") return filteredTasks;

    const sorted = [...filteredTasks].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case "title":
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case "due_date":
          aVal = new Date(a.due_date).getTime();
          bVal = new Date(b.due_date).getTime();
          break;
        case "priority":
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          aVal = priorityOrder[a.priority] || 0;
          bVal = priorityOrder[b.priority] || 0;
          break;
        case "assignee":
          const aAssignees = getTaskAssignees(a);
          const bAssignees = getTaskAssignees(b);
          aVal = aAssignees.length > 0 ? aAssignees[0].full_name : "";
          bVal = bAssignees.length > 0 ? bAssignees[0].full_name : "";
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredTasks, viewMode, sortField, sortDirection]);

  // Group tasks by status for Kanban
  const kanbanTasks = useMemo(() => {
    const grouped: Record<string, ITask[]> = {
      "To Do": [],
      "In Progress": [],
      Done: [],
    };

    filteredTasks.forEach((task) => {
      const statusLabel = STATUS_MAP[task.status] || "To Do";
      if (grouped[statusLabel]) {
        grouped[statusLabel].push(task);
      }
    });

    return grouped;
  }, [filteredTasks]);

  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, task: ITask) => {
    // Only allow dragging if user can update task status
    if (!canUpdateTaskStatus(currentUser, task)) {
      e.preventDefault();
      return;
    }
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (!draggedTask) return;

    // Check if user can update task status
    if (!canUpdateTaskStatus(currentUser, draggedTask)) {
      alert("You don't have permission to update this task's status");
      setDraggedTask(null);
      return;
    }

    const newStatus = REVERSE_STATUS_MAP[targetStatus] || "pending";
    
    // Check if status actually changed
    if (draggedTask.status === newStatus) {
      setDraggedTask(null);
      return;
    }

    // Optimistically update UI
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.task_id === draggedTask.task_id
          ? { ...task, status: newStatus, updated_at: new Date().toISOString() }
          : task
      )
    );

    try {
      // Prepare request body for backend
      const requestBody = {
        title: draggedTask.title,
        description: draggedTask.description || "",
        status: mapStatusToBackend(newStatus),
        priority: mapPriorityToBackend(draggedTask.priority),
        startDate: draggedTask.start_date || null,
        dueDate: draggedTask.due_date,
        categoryId: null, // Category will be handled separately if needed
        userId: currentUser?.user_id || null, // User performing the update
      };

      // Call backend API to update task status
      const response = await fetch(
        `${API_BASE_URL}/api/tasks/${draggedTask.task_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to update task status");
      }

      // Refresh the task list to ensure consistency
      await fetchData();
    } catch (error) {
      console.error("Error updating task status:", error);
      
      // Revert the optimistic update on error
      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.task_id === draggedTask.task_id
            ? { ...task, status: draggedTask.status }
            : task
        )
      );
      
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update task status. Please try again."
      );
    } finally {
      setDraggedTask(null);
    }
  };

  // Map frontend status to backend status
  const mapStatusToBackend = (status: ITask["status"]): string => {
    switch (status) {
      case "pending":
        return "PENDING";
      case "in progress":
        return "IN_PROGRESS";
      case "completed":
        return "DONE";
      case "on hold":
        return "PENDING";
      default:
        return "PENDING";
    }
  };

  // Map frontend priority to backend priority
  const mapPriorityToBackend = (priority: ITask["priority"]): string => {
    switch (priority) {
      case "low":
        return "LOW";
      case "medium":
        return "MEDIUM";
      case "high":
        return "HIGH";
      case "urgent":
        return "URGENT";
      default:
        return "MEDIUM";
    }
  };

  // Handle task creation/update
  const handleSubmitTask = async (formData: ITaskForm) => {
    if (selectedTask) {
      // Check permission to edit
      if (!canEditTask(currentUser, selectedTask)) {
        alert("You don't have permission to edit tasks");
        return;
      }

      try {
        // Prepare request body for backend
        const requestBody = {
          title: formData.title,
          description: formData.description || "",
          status: mapStatusToBackend(formData.status),
          priority: mapPriorityToBackend(formData.priority),
          startDate: formData.start_date || null,
          dueDate: formData.due_date,
          categoryId: null, // Category will be handled separately if needed
          assigneeIds: formData.assignees || [],
          userId: currentUser?.user_id || null, // User performing the update
        };

        // Call backend API to update task
        await apiPut(`/tasks/${selectedTask.task_id}`, requestBody);

        // Refresh the task list to get the updated task
        await fetchData();

        // Close the form
        setIsFormOpen(false);
        setSelectedTask(null);
      } catch (error) {
        console.error("Error updating task:", error);
        alert(
          error instanceof Error
            ? error.message
            : "Failed to update task. Please try again."
        );
      }
    } else {
      // Check permission to create
      if (!canCreateTask(currentUser)) {
        alert("You don't have permission to create tasks");
        return;
      }

      if (!currentUser) {
        alert("Please login to create tasks");
        return;
      }

      try {
        // Prepare request body for backend
        const requestBody = {
          title: formData.title,
          description: formData.description || "",
          status: mapStatusToBackend(formData.status),
          priority: mapPriorityToBackend(formData.priority),
          startDate: formData.start_date || null,
          dueDate: formData.due_date,
          categoryId: null, // Category will be handled separately if needed
          createdById: currentUser.user_id,
          assigneeIds: formData.assignees || [],
        };

        // Call backend API to create task
        const response = await fetch(`${API_BASE_URL}/api/tasks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to create task");
        }

        const createdTask = await response.json();

        // Upload attachments if any were selected
        if (formData.attachments && formData.attachments.length > 0) {
          for (const file of formData.attachments) {
            const fd = new FormData();
            fd.append("file", file);
            try {
              await apiUpload(`/tasks/${createdTask.taskId}/attachments`, fd);
            } catch (uploadErr) {
              console.warn("Attachment upload failed:", uploadErr);
            }
          }
        }

        // Refresh the task list to get the newly created task
        await fetchData();

        // Close the form
        setIsFormOpen(false);
        setSelectedTask(null);
      } catch (error) {
        console.error("Error creating task:", error);
        alert(
          error instanceof Error
            ? error.message
            : "Failed to create task. Please try again."
        );
      }
    }
  };

  // Handle task deletion (soft delete for admin)
  const handleDeleteTask = async (taskId: number) => {
    if (!canDeleteTask(currentUser)) {
      alert("You don't have permission to delete tasks");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to delete task");
      }

      // Refresh the task list to reflect the deletion
      await fetchData();
    } catch (error) {
      console.error("Error deleting task:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete task. Please try again."
      );
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const getPriorityColor = (priority: ITask["priority"]) => {
    switch (priority) {
      case "urgent":
      case "high":
        return "#f44336";
      case "medium":
        return "#ff9800";
      case "low":
        return "#2ecc71";
      default:
        return "#9aa0a6";
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
      <Sidebar />
      <main className="tasks-main">
        <div className="tasks-header">
          <div>
            <h1 className="tasks-title">Tasks</h1>
            <p className="tasks-subtitle">Manage and organize your tasks</p>
          </div>
        </div>

        <div className="tasks-controls">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === "kanban" ? "active" : ""}`}
              onClick={() => setViewMode("kanban")}
            >
              Kanban
            </button>
            <button
              className={`toggle-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
            >
              List
            </button>
          </div>

          <div className="filters">
            <input
              type="text"
              className="filter-search"
              placeholder="Search title or description..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />

            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>

            <select
              className="filter-select"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <select
              className="filter-select"
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
            >
              <option value="all">All Assignees</option>
              {users.map((user) => (
                <option key={user.user_id} value={user.user_id.toString()}>
                  {user.full_name}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
            >
              <option value="all">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>

          <div className="tasks-header-right">
            <span className="task-count">{filteredTasks.length} tasks</span>
            <button className="clear-filters-btn" onClick={clearFilters} type="button">
              Clear filters
            </button>
            <button
              className="export-csv-btn"
              onClick={handleExportCsv}
              type="button"
              disabled={exporting}
            >
              {exporting ? "Exporting..." : "Export CSV"}
            </button>
            {canCreateTask(currentUser) && (
              <button
                className="new-task-btn"
                onClick={() => {
                  setSelectedTask(null);
                  setIsFormOpen(true);
                }}
              >
                + New Task
              </button>
            )}
          </div>
        </div>

        <div className="tasks-content-wrapper">
          {isLoading ? (
            <Spinner label="Loading tasks..." />
          ) : error ? (
            <div className="error-state">
              <p>Unable to load tasks: {error}</p>
              <button className="retry-btn" onClick={fetchData}>
                Try again
              </button>
            </div>
          ) : filteredTasks.length === 0 ? (
            <EmptyState
              icon="🔍"
              title="No tasks found"
              message="No tasks found. Try adjusting your filters."
            />
          ) : viewMode === "kanban" ? (
            <div className="kanban-board">
              {Object.entries(kanbanTasks).map(([status, statusTasks]) => (
                <div
                  key={status}
                  className="kanban-column"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, status)}
                >
                  <div className="kanban-column-header">
                    <h3>{status}</h3>
                    <span className="column-count">{statusTasks.length}</span>
                  </div>
                  <div className="kanban-column-content">
                    {statusTasks.map((task) => {
                      const assignees = getTaskAssignees(task);
                      const tags = taskTags[task.task_id] || [];
                      return (
                        <div
                          key={task.task_id}
                          className="task-card"
                          draggable
                          onDragStart={(e) => handleDragStart(e, task)}
                          onClick={() => navigate(`/tasks/${task.task_id}`)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="task-card-header">
                            <h4 className="task-card-title">{task.title}</h4>
                            {(canEditTask(currentUser, task) ||
                              canDeleteTask(currentUser)) && (
                              <div className="task-card-actions">
                                {canEditTask(currentUser, task) && (
                                  <button
                                    className="icon-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTask(task);
                                      setIsFormOpen(true);
                                    }}
                                    title="Edit"
                                  >
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                  </button>
                                )}
                                {canDeleteTask(currentUser) && (
                                  <button
                                    className="icon-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteTask(task.task_id);
                                    }}
                                    title="Delete"
                                  >
                                    <svg
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <polyline points="3 6 5 6 21 6" />
                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="task-card-description">
                            {task.description}
                          </p>
                          <div className="task-card-tags">
                            <span
                              className="priority-badge"
                              style={{
                                backgroundColor: getPriorityColor(
                                  task.priority
                                ),
                              }}
                            >
                              {task.priority}
                            </span>
                            <span className="category-badge">
                              {task.category}
                            </span>
                            {tags.map((tag) => (
                              <span key={tag} className="tag-badge">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <div className="task-card-footer">
                            <span className="due-date">
                              Due: {formatDate(task.due_date)}
                            </span>
                            <span className="assignee-info">
                              Assigned to {assignees.length}{" "}
                              {assignees.length === 1 ? "person" : "persons"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="list-view">
              <table className="tasks-table">
                <thead>
                  <tr>
                    <th>
                      <button
                        className="sort-btn"
                        onClick={() => {
                          setSortField("title");
                          setSortDirection(
                            sortField === "title" && sortDirection === "asc"
                              ? "desc"
                              : "asc"
                          );
                        }}
                      >
                        Title{" "}
                        {sortField === "title" &&
                          (sortDirection === "asc" ? "↑" : "↓")}
                      </button>
                    </th>
                    <th>
                      <button
                        className="sort-btn"
                        onClick={() => {
                          setSortField("assignee");
                          setSortDirection(
                            sortField === "assignee" && sortDirection === "asc"
                              ? "desc"
                              : "asc"
                          );
                        }}
                      >
                        Assignee{" "}
                        {sortField === "assignee" &&
                          (sortDirection === "asc" ? "↑" : "↓")}
                      </button>
                    </th>
                    <th>
                      <button
                        className="sort-btn"
                        onClick={() => {
                          setSortField("due_date");
                          setSortDirection(
                            sortField === "due_date" && sortDirection === "asc"
                              ? "desc"
                              : "asc"
                          );
                        }}
                      >
                        Due Date{" "}
                        {sortField === "due_date" &&
                          (sortDirection === "asc" ? "↑" : "↓")}
                      </button>
                    </th>
                    <th>
                      <button
                        className="sort-btn"
                        onClick={() => {
                          setSortField("priority");
                          setSortDirection(
                            sortField === "priority" && sortDirection === "asc"
                              ? "desc"
                              : "asc"
                          );
                        }}
                      >
                        Priority{" "}
                        {sortField === "priority" &&
                          (sortDirection === "asc" ? "↑" : "↓")}
                      </button>
                    </th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTasks.map((task) => {
                    const assignees = getTaskAssignees(task);
                    return (
                      <tr 
                        key={task.task_id}
                        onClick={() => navigate(`/tasks/${task.task_id}`)}
                        style={{ cursor: "pointer" }}
                      >
                        <td>
                          <div className="table-task-title">
                            <strong>{task.title}</strong>
                            <span className="table-task-desc">
                              {task.description}
                            </span>
                          </div>
                        </td>
                        <td>
                          {assignees.length > 0 ? (
                            <div className="assignee-list">
                              {assignees.map((user) => (
                                <span
                                  key={user.user_id}
                                  className="assignee-name"
                                >
                                  {user.full_name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="no-assignee">Unassigned</span>
                          )}
                        </td>
                        <td>{formatDate(task.due_date)}</td>
                        <td>
                          <span
                            className="priority-badge"
                            style={{
                              backgroundColor: getPriorityColor(task.priority),
                            }}
                          >
                            {task.priority}
                          </span>
                        </td>
                        <td>
                          <span className="status-badge">
                            {STATUS_MAP[task.status] || task.status}
                          </span>
                        </td>
                        <td>
                          {(canEditTask(currentUser, task) ||
                            canDeleteTask(currentUser)) && (
                            <div className="table-actions">
                              {canEditTask(currentUser, task) && (
                                <button
                                  className="icon-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTask(task);
                                    setIsFormOpen(true);
                                  }}
                                  title="Edit"
                                >
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
                              )}
                              {canDeleteTask(currentUser) && (
                                <button
                                  className="icon-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(task.task_id);
                                  }}
                                  title="Delete"
                                >
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isFormOpen && (
          <TaskFormModal
            task={selectedTask}
            onClose={() => {
              setIsFormOpen(false);
              setSelectedTask(null);
            }}
            onSubmit={handleSubmitTask}
            users={users}
            categories={categories}
            existingTags={allTags}
            taskTags={taskTags}
            currentUser={currentUser}
          />
        )}
      </main>
    </div>
  );
};

interface TaskFormModalProps {
  task: ITask | null;
  onClose: () => void;
  onSubmit: (data: ITaskForm) => void;
  users: IUser[];
  categories: string[];
  existingTags: string[];
  taskTags: Record<number, string[]>;
  currentUser: IUser | null;
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({
  task,
  onClose,
  onSubmit,
  users,
  categories,
  existingTags,
  taskTags,
  currentUser,
}) => {
  const [formData, setFormData] = useState<ITaskForm>({
    title: task?.title || "",
    description: task?.description || "",
    start_date: task?.start_date || "",
    due_date: task?.due_date || "",
    completed_date: task?.completed_date || null,
    status: task?.status || "pending",
    priority: task?.priority || "medium",
    category: task?.category || "",
    tags: task ? taskTags[task.task_id] || [] : [],
    attachments: [],
    assignees: task?.assignee_ids ? [...task.assignee_ids] : [],
  });
  const [tagInput, setTagInput] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((tag) => tag !== tagToRemove) || [],
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...files]);
      setFormData((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...files],
      }));
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleToggleAssignee = (userId: number) => {
    setFormData((prev) => {
      const assignees = prev.assignees || [];
      if (assignees.includes(userId)) {
        return { ...prev, assignees: assignees.filter((id) => id !== userId) };
      } else {
        return { ...prev, assignees: [...assignees, userId] };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.due_date) {
      alert("Please fill in required fields (Title and Due Date)");
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{task ? "Edit Task" : "Create New Task"}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form className="task-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="Enter task title"
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category</label>
              {!task ? (
                // When creating new task: use input with datalist for free text input
                <>
                  <input
                    type="text"
                    id="category"
                    name="category"
                    list="category-list"
                    value={formData.category}
                    onChange={handleChange}
                    placeholder="Enter or select category"
                  />
                  <datalist id="category-list">
                    {categories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </>
              ) : (
                // When editing: use select dropdown
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Enter task description"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_date">Start Date</label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={formData.start_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="due_date">Due Date *</label>
              <input
                type="date"
                id="due_date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="pending">Pending</option>
                <option value="in progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on hold">On Hold</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="priority">Priority</label>
              <select
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {canAssignEmployees(currentUser) && (
            <div className="form-group">
              <label>Assignees</label>
              <div className="assignee-checkboxes">
                {users.map((user) => (
                  <label key={user.user_id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={
                        formData.assignees?.includes(user.user_id) || false
                      }
                      onChange={() => handleToggleAssignee(user.user_id)}
                    />
                    <span>
                      {user.full_name} ({user.username})
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Tags</label>
            <div className="tags-input">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Type a tag and press Enter"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="add-tag-btn"
              >
                Add
              </button>
            </div>
            <div className="tags-list">
              {formData.tags?.map((tag) => (
                <span key={tag} className="tag-item">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="tag-remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            {existingTags.length > 0 && (
              <div className="existing-tags">
                <span className="existing-tags-label">Existing tags:</span>
                {existingTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="existing-tag-btn"
                    onClick={() => {
                      if (!formData.tags?.includes(tag)) {
                        setFormData((prev) => ({
                          ...prev,
                          tags: [...(prev.tags || []), tag],
                        }));
                      }
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="attachments">Attachments (Images & Files)</label>
            <input
              type="file"
              id="attachments"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
            />
            {selectedFiles.length > 0 && (
              <div className="files-list">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="file-item">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">
                      {(file.size / 1024).toFixed(2)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="file-remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              {task ? "Update Task" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Tasks;
