import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../common/sidebar";
import type { ITask, IComment, IUser } from "../utils/interfaces";
import { apiGet, apiPost, apiDelete, apiUpload, apiDownload } from "../utils/api";
import { isManager, isAdmin } from "../utils/permissions";
import { useToast } from "../components/ToastProvider";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import "./taskdetail.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

interface BackendAttachment {
  attachmentId: number;
  taskId: number;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedById: number | null;
  uploadedByName: string | null;
  uploadedAt: string;
  downloadUrl: string;
}

type CommentCategory = 'Started' | 'Completed' | 'In Progress' | 'Commented' | 'Bug' | 'Assigned';

type BackendTask = {
  taskId: number;
  title: string;
  description: string;
  status: string; // "PENDING" | "TO_DO" | "IN_PROGRESS" | "DONE"
  priority: string; // "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  startDate: string | null;
  dueDate: string;
  categoryName: string | null;
  createdByUsername: string | null;
  assignedUsers: string[]; // List of full names
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

type BackendComment = {
  commentId: number;
  taskId: number;
  userId: number;
  username: string;
  userFullName: string;
  parentCommentId: number | null;
  text: string;
  category: string | null;
  createdAt: string;
};

const TaskDetail: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<ITask | null>(null);
  const [users, setUsers] = useState<IUser[]>([]);
  const [comments, setComments] = useState<IComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<CommentCategory[]>([]);
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<BackendAttachment[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [confirm, setConfirm] = useState<{ message: string; action: () => void } | null>(null);
  const toast = useToast();

  const mapStatusFromBackend = (status: string): ITask["status"] => {
    switch (status.toUpperCase()) {
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

  const mapPriorityFromBackend = (priority: string): ITask["priority"] => {
    switch (priority.toUpperCase()) {
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

  const transformBackendTask = (task: BackendTask, users: IUser[]): ITask => {
    try {
      // Map assigned user names to user IDs
      const assigneeIds = task.assignedUsers && Array.isArray(task.assignedUsers)
        ? task.assignedUsers
            .map((name) => users.find((u) => u.full_name === name)?.user_id)
            .filter((id): id is number => id !== undefined)
        : [];

      return {
        task_id: task.taskId || 0,
        title: task.title || "",
        description: task.description ?? "",
        start_date: task.startDate ?? "",
        due_date: task.dueDate ?? "",
        completed_date: null,
        status: mapStatusFromBackend(task.status || "PENDING"),
        priority: mapPriorityFromBackend(task.priority || "MEDIUM"),
        category: task.categoryName ?? "General",
        created_at: task.createdAt ?? new Date().toISOString(),
        updated_at: task.updatedAt ?? new Date().toISOString(),
        is_trashed: false,
        tags: Array.isArray(task.tags) ? task.tags : [],
        assignee_ids: assigneeIds,
      };
    } catch (err) {
      console.error("Error transforming task:", err, task);
      throw new Error("Failed to transform task data");
    }
  };

  const transformBackendComment = (comment: BackendComment): IComment => ({
    comment_id: comment.commentId,
    user_id: comment.userId,
    task_id: comment.taskId,
    parent_comment_id: comment.parentCommentId,
    text: comment.text,
    created_at: comment.createdAt,
    category: comment.category as IComment["category"] | undefined,
  });

  const fetchTaskData = useCallback(async () => {
    if (!taskId) {
      setError("Task ID is missing");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("Fetching task data for ID:", taskId);
      console.log("API URL:", `${API_BASE_URL}/api/tasks/${taskId}`);
      
      const [taskRes, usersRes, commentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/tasks/${taskId}`),
        fetch(`${API_BASE_URL}/api/users`),
        fetch(`${API_BASE_URL}/api/v1/tasks/${taskId}/comments`),
      ]);

      console.log("Task response status:", taskRes.status);
      console.log("Users response status:", usersRes.status);
      console.log("Comments response status:", commentsRes.status);

      if (!taskRes.ok) {
        const errorText = await taskRes.text();
        console.error("Task API error:", errorText);
        if (taskRes.status === 404) {
          throw new Error("Task not found");
        }
        throw new Error(`Failed to load task: ${taskRes.status} ${errorText}`);
      }
      if (!usersRes.ok) {
        const errorText = await usersRes.text();
        console.error("Users API error:", errorText);
        throw new Error(`Failed to load users: ${usersRes.status} ${errorText}`);
      }

      const taskJson: BackendTask = await taskRes.json();
      const usersJson: BackendUser[] = await usersRes.json();
      const commentsJson: BackendComment[] = commentsRes.ok 
        ? await commentsRes.json() 
        : [];

      console.log("Task data received:", taskJson);
      console.log("Users data received:", usersJson);
      console.log("Comments data received:", commentsJson);

      if (!taskJson || !taskJson.taskId) {
        throw new Error("Invalid task data received from server");
      }

      const normalizedUsers = usersJson.map(transformBackendUser);
      const normalizedTask = transformBackendTask(taskJson, normalizedUsers);
      const normalizedComments = commentsJson.map(transformBackendComment);

      console.log("Normalized task:", normalizedTask);
      console.log("Normalized users:", normalizedUsers);
      console.log("Normalized comments:", normalizedComments);

      setTask(normalizedTask);
      setUsers(normalizedUsers);
      setComments(normalizedComments);
      setError(null);
    } catch (err) {
      console.error("Error loading task:", err);
      const errorMessage = err instanceof Error ? err.message : "Unexpected error occurred";
      console.error("Error message:", errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  const fetchAttachments = useCallback(async () => {
    if (!taskId) return;
    try {
      const data = await apiGet<BackendAttachment[]>(`/tasks/${taskId}/attachments`);
      setAttachments(data);
    } catch (err) {
      console.error("Error loading attachments:", err);
    }
  }, [taskId]);

  useEffect(() => {
    // Get current user from localStorage
    const userStr = localStorage.getItem("currentUser");
    if (userStr) {
      try {
        const user = JSON.parse(userStr) as IUser;
        setCurrentUser(user);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }

    // Load task data from API (includes comments) + attachments
    fetchTaskData();
    fetchAttachments();
  }, [taskId, fetchTaskData, fetchAttachments]);

  const taskAssignees = useMemo(() => {
    if (!task) return [];
    if (!task.assignee_ids?.length) {
      return [];
    }
    return users.filter((u) => task.assignee_ids?.includes(u.user_id));
  }, [task, users]);

  const getCommentAuthor = (userId: number): IUser | undefined => {
    return users.find((u) => u.user_id === userId);
  };

  const canManageAttachments = isManager(currentUser);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !taskId) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      setUploading(true);
      await apiUpload(`/tasks/${taskId}/attachments`, formData);
      toast.success("File uploaded");
      await fetchAttachments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDownloadAttachment = async (att: BackendAttachment) => {
    try {
      const blob = await apiDownload(`/tasks/${att.taskId}/attachments/${att.attachmentId}/download`);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    }
  };

  const handleDeleteAttachment = (att: BackendAttachment) => {
    setConfirm({
      message: `Delete attachment "${att.fileName}"?`,
      action: async () => {
        try {
          await apiDelete(`/tasks/${att.taskId}/attachments/${att.attachmentId}`);
          toast.success("Attachment deleted");
          await fetchAttachments();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Delete failed");
        } finally {
          setConfirm(null);
        }
      },
    });
  };

  const canDeleteComment = (comment: IComment): boolean =>
    isAdmin(currentUser) || comment.user_id === currentUser?.user_id;

  const handleDeleteComment = (commentId: number) => {
    if (!taskId) return;
    setConfirm({
      message: "Delete this comment?",
      action: async () => {
        try {
          await apiDelete(`/tasks/${taskId}/comments/${commentId}`);
          setComments((prev) => prev.filter((c) => c.comment_id !== commentId));
          toast.success("Comment deleted");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Delete failed");
        } finally {
          setConfirm(null);
        }
      },
    });
  };

  const handleCategoryToggle = (category: CommentCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !taskId || !currentUser) return;

    try {
      // taskId comes from the URL and userId from the JWT; the server fills them in.
      const requestBody = {
        parentCommentId: null,
        text: newComment.trim(),
        category: selectedCategories.length > 0 ? selectedCategories[0] : "Commented",
      };

      const commentJson = await apiPost<BackendComment>(
        `/tasks/${taskId}/comments`,
        requestBody
      );
      const newCommentObj = transformBackendComment(commentJson);

      setComments((prev) => [...prev, newCommentObj]);
      setNewComment("");
      setSelectedCategories([]);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create comment"
      );
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (fileType: string): string => {
    if (fileType.startsWith("image/")) return "🖼️";
    if (fileType === "application/pdf") return "📄";
    if (fileType.includes("word") || fileType.includes("document")) return "📝";
    if (fileType.includes("excel") || fileType.includes("spreadsheet")) return "📊";
    if (fileType.includes("zip") || fileType.includes("archive")) return "📦";
    return "📎";
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

  const getStatusLabel = (status: ITask["status"]) => {
    const statusMap: Record<string, string> = {
      pending: "To Do",
      "in progress": "In Progress",
      completed: "Completed",
      "on hold": "On Hold",
    };
    return statusMap[status] || status;
  };

  const categoryOptions: CommentCategory[] = [
    'Started',
    'Completed',
    'In Progress',
    'Commented',
    'Bug',
    'Assigned',
  ];

  if (loading) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <main className="task-detail-main">
          <div className="task-detail-header">
            <button className="back-button" onClick={() => navigate("/tasks")}>
              ← Back to Tasks
            </button>
          </div>
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p>Loading task...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <main className="task-detail-main">
          <div className="task-detail-header">
            <button className="back-button" onClick={() => navigate("/tasks")}>
              ← Back to Tasks
            </button>
          </div>
          <div style={{ padding: "2rem" }}>
            <div className="error-message" style={{ 
              background: "#fee",
              border: "1px solid #fcc",
              borderRadius: "8px",
              padding: "1.5rem",
              margin: "2rem 0"
            }}>
              <h3 style={{ marginTop: 0, color: "#c33" }}>Error Loading Task</h3>
              <p style={{ color: "#666" }}>{error || "Task not found"}</p>
              <p style={{ fontSize: "0.875rem", color: "#999", marginTop: "0.5rem" }}>
                Task ID: {taskId}
              </p>
              <button
                onClick={fetchTaskData}
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem 1.5rem",
                  background: "#4f46e5",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Try again
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Safety check
  if (!task) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <main className="task-detail-main">
          <div className="task-detail-header">
            <button className="back-button" onClick={() => navigate("/tasks")}>
              ← Back to Tasks
            </button>
          </div>
          <div style={{ padding: "2rem" }}>
            <div className="error-message">
              <p>Task data is not available</p>
              <button onClick={fetchTaskData} style={{
                marginTop: "1rem",
                padding: "0.75rem 1.5rem",
                background: "#4f46e5",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}>
                Retry
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main className="task-detail-main">
        <div className="task-detail-header">
          <button className="back-button" onClick={() => navigate("/tasks")}>
            ← Back to Tasks
          </button>
          <h1 className="task-detail-title">{task.title || "Untitled Task"}</h1>
        </div>

        <div className="task-detail-content">
          {/* Task Information */}
          <div className="task-info-section">
            <div className="section-header">
              <h2>Task Information</h2>
            </div>
            <div className="task-info-grid">
              <div className="info-item">
                <label>Description</label>
                <p>{task.description || "No description provided"}</p>
              </div>
              <div className="info-item">
                <label>Status</label>
                <span className="status-badge">{getStatusLabel(task.status)}</span>
              </div>
              <div className="info-item">
                <label>Priority</label>
                <span
                  className="priority-badge"
                  style={{ backgroundColor: getPriorityColor(task.priority) }}
                >
                  {task.priority}
                </span>
              </div>
              <div className="info-item">
                <label>Category</label>
                <span className="category-badge">{task.category}</span>
              </div>
              <div className="info-item">
                <label>Start Date</label>
                <p>{formatDate(task.start_date)}</p>
              </div>
              <div className="info-item">
                <label>Due Date</label>
                <p>{formatDate(task.due_date)}</p>
              </div>
              {task.completed_date && (
                <div className="info-item">
                  <label>Completed Date</label>
                  <p>{formatDate(task.completed_date)}</p>
                </div>
              )}
              <div className="info-item">
                <label>Assigned To</label>
                <div className="assignees-list">
                  {taskAssignees.length > 0 ? (
                    taskAssignees.map((user) => (
                      <span key={user.user_id} className="assignee-badge">
                        {user.full_name}
                      </span>
                    ))
                  ) : (
                    <span className="no-assignee">Unassigned</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="attachments-section">
            <div className="section-header">
              <h2>Attachments ({attachments.length})</h2>
              <label className="upload-btn">
                {uploading ? "Uploading..." : "+ Upload file"}
                <input
                  type="file"
                  hidden
                  accept=".jpg,.jpeg,.png,.pdf,.docx,.xlsx"
                  onChange={handleUploadFile}
                  disabled={uploading}
                />
              </label>
            </div>
            <p className="attachments-hint">Allowed: jpg, png, pdf, docx, xlsx (max 10MB)</p>
            <div className="attachments-list">
              {attachments.length === 0 ? (
                <div className="no-comments">No attachments yet.</div>
              ) : (
                attachments.map((att) => (
                  <div key={att.attachmentId} className="attachment-item">
                    <div className="attachment-icon">{getFileIcon(att.mimeType || "")}</div>
                    <div className="attachment-info">
                      <div className="attachment-name">{att.fileName}</div>
                      <div className="attachment-meta">
                        <span>{formatFileSize(att.fileSize || 0)}</span>
                        <span>•</span>
                        <span>
                          Uploaded by {att.uploadedByName || "Unknown"} on{" "}
                          {formatDateTime(att.uploadedAt)}
                        </span>
                      </div>
                    </div>
                    <button
                      className="download-btn"
                      onClick={() => handleDownloadAttachment(att)}
                      title="Download file"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </button>
                    {canManageAttachments && (
                      <button
                        className="download-btn"
                        onClick={() => handleDeleteAttachment(att)}
                        title="Delete attachment"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Comments Section */}
          <div className="comments-section">
            <div className="section-header">
              <h2>Comments ({comments.length})</h2>
            </div>

            {/* Add Comment Form */}
            <div className="comment-form-container">
              <form onSubmit={handleSubmitComment} className="comment-form">
                <div className="comment-categories">
                  <label>Categories:</label>
                  <div className="category-checkboxes">
                    {categoryOptions.map((category) => (
                      <label key={category} className="category-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category)}
                          onChange={() => handleCategoryToggle(category)}
                        />
                        <span>{category}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <textarea
                  className="comment-input"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={4}
                  required
                />
                <button type="submit" className="submit-comment-btn">
                  Add Comment
                </button>
              </form>
            </div>

            {/* Comments List */}
            <div className="comments-list">
              {comments.length > 0 ? (
                comments
                  .filter((c) => !c.parent_comment_id)
                  .map((comment) => {
                    const author = getCommentAuthor(comment.user_id);
                    const replies = comments.filter(
                      (c) => c.parent_comment_id === comment.comment_id
                    );

                    return (
                      <div key={comment.comment_id} className="comment-item">
                        <div className="comment-header">
                          <div className="comment-author">
                            <strong>{author?.full_name || "Unknown User"}</strong>
                            {comment.category && (
                              <span className="comment-category-badge">
                                {comment.category}
                              </span>
                            )}
                          </div>
                          <span className="comment-date">
                            {formatDateTime(comment.created_at)}
                            {canDeleteComment(comment) && (
                              <button
                                className="comment-delete-btn"
                                onClick={() => handleDeleteComment(comment.comment_id)}
                                title="Delete comment"
                              >
                                ×
                              </button>
                            )}
                          </span>
                        </div>
                        <div className="comment-text">{comment.text}</div>
                        {replies.length > 0 && (
                          <div className="comment-replies">
                            {replies.map((reply) => {
                              const replyAuthor = getCommentAuthor(reply.user_id);
                              return (
                                <div key={reply.comment_id} className="comment-reply">
                                  <div className="comment-header">
                                    <div className="comment-author">
                                      <strong>
                                        {replyAuthor?.full_name || "Unknown User"}
                                      </strong>
                                      {reply.category && (
                                        <span className="comment-category-badge">
                                          {reply.category}
                                        </span>
                                      )}
                                    </div>
                                    <span className="comment-date">
                                      {formatDateTime(reply.created_at)}
                                    </span>
                                  </div>
                                  <div className="comment-text">{reply.text}</div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
              ) : (
                <div className="no-comments">No comments yet. Be the first to comment!</div>
              )}
            </div>
          </div>
        </div>

        <ConfirmDialog
          open={!!confirm}
          message={confirm?.message || ""}
          onConfirm={() => confirm?.action()}
          onCancel={() => setConfirm(null)}
        />
      </main>
    </div>
  );
};

export default TaskDetail;

