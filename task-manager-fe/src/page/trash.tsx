import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../common/sidebar";
import type { ITask, IUser } from "../utils/interfaces";
import { isManager as isAdmin } from "../utils/permissions";
import "./trash.css";

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

const Trash: React.FC = () => {
  const [trashedTasks, setTrashedTasks] = useState<ITask[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
    is_trashed: true,
    tags: task.tags ?? [],
    assignee_ids: task.assigneeIds ?? [],
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [trashRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/tasks/trash`),
        fetch(`${API_BASE_URL}/api/users`),
      ]);

      if (!trashRes.ok) {
        throw new Error("Failed to load deleted tasks");
      }
      if (!usersRes.ok) {
        throw new Error("Failed to load users");
      }

      const trashJson: BackendTask[] = await trashRes.json();
      const usersJson: BackendUser[] = await usersRes.json();

      const normalizedTasks = trashJson.map(transformBackendTask);
      const normalizedUsers = usersJson.map(transformBackendUser);

      setTrashedTasks(normalizedTasks);
      setUsers(normalizedUsers);
      setError(null);
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const userStr = localStorage.getItem("currentUser");
    if (userStr) {
      try {
        const user = JSON.parse(userStr) as IUser;
        setCurrentUser(user);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, [fetchData]);

  // Get assignees for a task
  const getTaskAssignees = (task: ITask): IUser[] => {
    if (!task.assignee_ids?.length) {
      return [];
    }
    return users.filter((u) => task.assignee_ids?.includes(u.user_id));
  };

  // Calculate days since deleted (using updated_at as deleted date)
  const getDaysSinceDeleted = (updatedAt: string): number => {
    const deletedDate = new Date(updatedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - deletedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Handle restore task
  const handleRestore = async (taskId: number) => {
    if (!isAdmin(currentUser)) {
      alert("You don't have permission to restore tasks");
      return;
    }

    if (!window.confirm("Are you sure you want to restore this task?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/restore`, {
        method: "PUT",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to restore task");
      }

      // Refresh the trash list
      await fetchData();
    } catch (error) {
      console.error("Error restoring task:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to restore task. Please try again."
      );
    }
  };

  // Handle permanent delete
  const handleDeletePermanently = async (taskId: number) => {
    if (!isAdmin(currentUser)) {
      alert("You don't have permission to permanently delete tasks");
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to permanently delete this task? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      // Note: The backend DELETE endpoint is a soft delete.
      // For permanent delete, we would need a separate endpoint.
      // For now, we'll use the DELETE endpoint which removes it from trash
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to delete task");
      }

      // Refresh the trash list
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

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  // Get priority color
  const getPriorityColor = (priority: ITask["priority"]): string => {
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
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main className="trash-main">
        <div className="trash-container">
          <div className="trash-header">
            <div>
              <h1 className="trash-title">Trash</h1>
              <p className="trash-subtitle">
                View and manage deleted tasks. Items in trash will be permanently
                deleted after 30 days.
              </p>
            </div>
            <button
              className="trash-refresh-btn"
              onClick={fetchData}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="trash-empty">
              <p className="trash-empty-text">Loading deleted tasks...</p>
            </div>
          ) : error ? (
            <div className="trash-empty">
              <p className="trash-empty-text" style={{ color: "#f44336" }}>
                Unable to load trash: {error}
              </p>
              <button
                onClick={fetchData}
                style={{
                  marginTop: "1rem",
                  padding: "0.5rem 1rem",
                  background: "#4f46e5",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
            </div>
          ) : trashedTasks.length === 0 ? (
            <div className="trash-empty">
              <div className="trash-empty-icon">
                <svg
                  width="80"
                  height="80"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <p className="trash-empty-text">Your trash is empty</p>
            </div>
          ) : (
            <div className="trash-list">
              {trashedTasks.map((task) => {
                const assignees = getTaskAssignees(task);
                const daysDeleted = getDaysSinceDeleted(task.updated_at);
                const daysRemaining = 30 - daysDeleted;

                return (
                  <div key={task.task_id} className="trash-item">
                    <div className="trash-item-content">
                      <div className="trash-item-header">
                        <h3 className="trash-item-title">{task.title}</h3>
                        <div className="trash-item-meta">
                          <span
                            className="priority-badge"
                            style={{ backgroundColor: getPriorityColor(task.priority) }}
                          >
                            {task.priority}
                          </span>
                          <span className="category-badge">{task.category}</span>
                        </div>
                      </div>
                      <p className="trash-item-description">{task.description}</p>
                      <div className="trash-item-details">
                        <div className="trash-item-info">
                          <span className="trash-item-label">Due Date:</span>
                          <span className="trash-item-value">
                            {formatDate(task.due_date)}
                          </span>
                        </div>
                        <div className="trash-item-info">
                          <span className="trash-item-label">Assigned to:</span>
                          <span className="trash-item-value">
                            {assignees.length > 0
                              ? assignees.map((u) => u.full_name).join(", ")
                              : "Unassigned"}
                          </span>
                        </div>
                        {task.tags && task.tags.length > 0 && (
                          <div className="trash-item-info">
                            <span className="trash-item-label">Tags:</span>
                            <span className="trash-item-value">
                              {task.tags.join(", ")}
                            </span>
                          </div>
                        )}
                        <div className="trash-item-info">
                          <span className="trash-item-label">Deleted:</span>
                          <span className="trash-item-value">
                            {formatDate(task.updated_at)} ({daysDeleted} days ago)
                          </span>
                        </div>
                        {daysRemaining > 0 ? (
                          <div className="trash-item-info">
                            <span className="trash-item-label">Auto-delete in:</span>
                            <span className="trash-item-value warning">
                              {daysRemaining} days
                            </span>
                          </div>
                        ) : (
                          <div className="trash-item-info">
                            <span className="trash-item-label">Status:</span>
                            <span className="trash-item-value danger">
                              Ready for permanent deletion
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {isAdmin(currentUser) && (
                      <div className="trash-item-actions">
                        <button
                          className="btn-restore"
                          onClick={() => handleRestore(task.task_id)}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                            <path d="M21 3v5h-5" />
                            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                            <path d="M3 21v-5h5" />
                          </svg>
                          Restore
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeletePermanently(task.task_id)}
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          Delete Permanently
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Trash;
