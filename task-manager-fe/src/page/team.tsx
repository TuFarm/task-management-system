import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "../common/sidebar";
import type { IUser, UserRole } from "../utils/interfaces";
import { canManageUsers } from "../utils/permissions";
import { apiPut, apiDelete } from "../utils/api";
import { useToast } from "../components/ToastProvider";
import "./team.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

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

interface IUserForm {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  avatarColor?: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  GROUP_LEADER: "Group Leader",
  MEMBER: "Member",
};

const Team: React.FC = () => {
  const toast = useToast();
  const [users, setUsers] = useState<IUser[]>([]);
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/users`);
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data: BackendUser[] = await response.json();
      const transformedUsers: IUser[] = data.map((user) => ({
        user_id: user.userId,
        username: user.username,
        email: user.email,
        full_name: user.fullName,
        role: user.role as UserRole,
        created_at: user.createdAt ?? new Date().toISOString(),
        is_active: user.status === "ACTIVE",
        avatar_color: user.avatarColor ?? undefined,
      }));
      setUsers(transformedUsers);
      setError(null);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(
        err instanceof Error ? err.message : "Unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();

    const userStr = localStorage.getItem("currentUser");
    if (userStr) {
      try {
        const user = JSON.parse(userStr) as IUser;
        setCurrentUser(user);
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, [fetchUsers]);

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getInitials = (fullName: string): string => {
    return fullName
      .split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (user: IUser): string => {
    if (user.avatar_color) {
      return user.avatar_color;
    }
    const colors = [
      "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
      "linear-gradient(135deg, #4299e1 0%, #3182ce 100%)",
      "linear-gradient(135deg, #48bb78 0%, #38a169 100%)",
      "linear-gradient(135deg, #ed8936 0%, #dd6b20 100%)",
      "linear-gradient(135deg, #f56565 0%, #e53e3e 100%)",
    ];
    return colors[user.user_id % colors.length];
  };

  const handleToggleUserStatus = async (user: IUser) => {
    if (!canManageUsers(currentUser)) {
      toast.error("Only an ADMIN can manage team members");
      return;
    }
    try {
      if (user.is_active) {
        await apiDelete(`/users/${user.user_id}`); // deactivate
      } else {
        await apiPut(`/users/${user.user_id}/activate`);
      }
      toast.success(user.is_active ? "Member deactivated" : "Member activated");
      await fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  };

  const handleChangeRole = async (userId: number, role: string) => {
    try {
      await apiPut(`/users/${userId}/role`, { role });
      toast.success("Role updated");
      await fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change role");
    }
  };

  const handleCreateUser = async (formData: IUserForm) => {
    if (!canManageUsers(currentUser)) {
      toast.error("Only an ADMIN can add team members");
      return;
    }

    try {
      const requestBody = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        role: formData.role,
        avatarColor: formData.avatarColor || null,
      };

      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to create user");
      }

      // Refresh the user list
      await fetchUsers();

      // Close the form
      setIsFormOpen(false);
    } catch (error) {
      console.error("Error creating user:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to create user. Please try again."
      );
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main className="team-main">
        <div className="team-container">
          <div className="team-header">
            <div>
              <h1 className="team-title">Team</h1>
              <p className="team-subtitle">View and manage your team members</p>
            </div>
            <div style={{ display: "flex", gap: "1rem", marginLeft: "auto" }}>
              {canManageUsers(currentUser) && (
                <button
                  className="team-add-member-btn"
                  onClick={() => setIsFormOpen(true)}
                >
                  + Add Member
                </button>
              )}
              <button
                className="team-refresh-btn"
                onClick={fetchUsers}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="team-grid">Loading team members...</div>
          ) : error ? (
            <div className="team-grid error-message">
              <p>Unable to load team: {error}</p>
              <button onClick={fetchUsers}>Try again</button>
            </div>
          ) : (
            <div className="team-grid">
              {users.map((user) => (
                <div key={user.user_id} className="team-member-card">
                  <div
                    className="member-avatar"
                    style={{ background: getAvatarColor(user) }}
                  >
                    <span className="member-initials">
                      {getInitials(user.full_name)}
                    </span>
                  </div>
                  <div className="member-info">
                    <h3 className="member-name">{user.full_name}</h3>
                    <p className="member-username">@{user.username}</p>
                    <p className="member-email">{user.email}</p>
                    <div className="member-meta">
                      <span
                        className={`member-role ${
                          user.role === "ADMIN"
                            ? "role-admin"
                            : user.role === "GROUP_LEADER"
                            ? "role-leader"
                            : "role-member"
                        }`}
                      >
                        {ROLE_LABELS[user.role] ?? user.role}
                      </span>
                      <span
                        className={`member-status ${
                          user.is_active ? "status-active" : "status-inactive"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="member-joined">
                      Joined {formatDate(user.created_at)}
                    </p>
                  </div>
                  {canManageUsers(currentUser) && (
                    <div className="member-admin-actions">
                      <select
                        className="role-select"
                        value={user.role}
                        onChange={(e) => handleChangeRole(user.user_id, e.target.value)}
                        title="Change role (ADMIN only)"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="GROUP_LEADER">Group Leader</option>
                        <option value="MEMBER">Member</option>
                      </select>
                      <button
                        className="toggle-status-btn"
                        onClick={() => handleToggleUserStatus(user)}
                      >
                        {user.is_active ? "Disable" : "Activate"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {isFormOpen && (
            <AddMemberModal
              onClose={() => setIsFormOpen(false)}
              onSubmit={handleCreateUser}
            />
          )}
        </div>
      </main>
    </div>
  );
};

interface AddMemberModalProps {
  onClose: () => void;
  onSubmit: (data: IUserForm) => void;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<IUserForm>({
    username: "",
    email: "",
    password: "",
    fullName: "",
    role: "MEMBER",
    avatarColor: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Team Member</h2>
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

        <form className="user-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">
              Username <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter username"
              required
            />
            {errors.username && (
              <span className="error-text">{errors.username}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email address"
              required
            />
            {errors.email && (
              <span className="error-text">{errors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Password <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password (min 6 characters)"
              required
            />
            {errors.password && (
              <span className="error-text">{errors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="fullName">
              Full Name <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter full name"
              required
            />
            {errors.fullName && (
              <span className="error-text">{errors.fullName}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="MEMBER">Member</option>
              <option value="GROUP_LEADER">Group Leader</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="avatarColor">Avatar Color (optional)</label>
            <input
              type="color"
              id="avatarColor"
              name="avatarColor"
              value={formData.avatarColor || "#4f46e5"}
              onChange={handleChange}
            />
            <p style={{ fontSize: "0.875rem", color: "#718096", marginTop: "0.5rem" }}>
              Choose a color for the member's avatar
            </p>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              Add Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Team;
