import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../common/sidebar";
import type { IUser, UserRole } from "../utils/interfaces";
import { apiGet, apiPut } from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ToastProvider";
import Spinner from "../components/ui/Spinner";
import "./userprofile.css";

interface BackendUser {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  avatarColor?: string | null;
  createdAt?: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  GROUP_LEADER: "Group Leader",
  MEMBER: "Member",
};

const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser, setUser } = useAuth();
  const toast = useToast();
  const [currentUser, setCurrentUser] = useState<IUser | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    full_name: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const toFrontend = (u: BackendUser): IUser => ({
    user_id: u.userId,
    username: u.username,
    email: u.email,
    full_name: u.fullName,
    role: u.role as UserRole,
    created_at: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
    is_active: u.status === "ACTIVE",
    avatar_color: u.avatarColor || undefined,
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!authUser) {
        navigate("/login");
        return;
      }
      try {
        const data = await apiGet<BackendUser>(`/users/${authUser.user_id}`);
        const fe = toFrontend(data);
        setCurrentUser(fe);
        setUser(fe);
      } catch {
        // Fall back to the in-memory user if the API call fails.
        setCurrentUser(authUser);
      }
    };
    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const formatDate = (dateString: string): string =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const handleOpenModal = () => {
    if (currentUser) {
      setFormData({
        username: currentUser.username,
        email: currentUser.email,
        full_name: currentUser.full_name,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setIsModalOpen(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!formData.username.trim() || !formData.email.trim() || !formData.full_name.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const wantsPasswordChange =
      formData.currentPassword.trim() ||
      formData.newPassword.trim() ||
      formData.confirmPassword.trim();

    if (wantsPasswordChange) {
      if (!formData.currentPassword.trim()) {
        toast.error("Please enter your current password");
        return;
      }
      if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(formData.newPassword)) {
        toast.error("New password must be 8+ chars with at least 1 uppercase letter and 1 number");
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        toast.error("New password and confirmation do not match");
        return;
      }
    }

    setSaving(true);
    try {
      // 1) Update profile fields (role is intentionally NOT sent here).
      const updated = await apiPut<BackendUser>(`/users/${currentUser.user_id}`, {
        username: formData.username.trim(),
        fullName: formData.full_name.trim(),
        email: formData.email.trim(),
      });
      const fe = toFrontend(updated);
      setCurrentUser(fe);
      setUser(fe);

      // 2) Change password via the dedicated endpoint, if requested.
      if (wantsPasswordChange) {
        await apiPut(`/users/${currentUser.user_id}/password`, {
          oldPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        });
        toast.success("Password changed successfully");
      }

      toast.success("Profile updated successfully");
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <main className="profile-main">
          <Spinner label="Loading profile..." />
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main className="profile-main">
        <div className="profile-container">
          <div className="profile-header">
            <h1 className="profile-title">Profile</h1>
            <p className="profile-subtitle">Manage your account settings and preferences</p>
          </div>

          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-avatar">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="profile-header-info">
                <h2 className="profile-username">{currentUser.username}</h2>
                <p className="profile-email">{currentUser.email}</p>
                <div className="profile-status-badge">
                  <span className="status-dot"></span>
                  {currentUser.is_active ? "Active" : "Inactive"}
                </div>
              </div>
            </div>

            <div className="profile-divider"></div>

            <div className="profile-details">
              <div className="profile-detail-item">
                <span className="profile-detail-label">Username:</span>
                <span className="profile-detail-value">{currentUser.username}</span>
              </div>
              <div className="profile-detail-item">
                <span className="profile-detail-label">Email:</span>
                <span className="profile-detail-value">{currentUser.email}</span>
              </div>
              <div className="profile-detail-item">
                <span className="profile-detail-label">Full Name:</span>
                <span className="profile-detail-value">{currentUser.full_name}</span>
              </div>
              <div className="profile-detail-item">
                <span className="profile-detail-label">Role:</span>
                <span className="profile-detail-value">
                  {ROLE_LABELS[currentUser.role] ?? currentUser.role}
                </span>
              </div>
              <div className="profile-detail-item">
                <span className="profile-detail-label">Account Status:</span>
                <span className="profile-detail-value">
                  {currentUser.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="profile-detail-item">
                <span className="profile-detail-label">Member Since:</span>
                <span className="profile-detail-value">{formatDate(currentUser.created_at)}</span>
              </div>
            </div>

            <button className="profile-edit-button" onClick={handleOpenModal}>
              Edit Profile
            </button>
          </div>
        </div>

        {isModalOpen && (
          <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Edit Profile</h2>
                <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form className="profile-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="username">Username *</label>
                  <input type="text" id="username" name="username" value={formData.username} onChange={handleInputChange} required />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} required />
                </div>

                <div className="form-group">
                  <label htmlFor="full_name">Full Name *</label>
                  <input type="text" id="full_name" name="full_name" value={formData.full_name} onChange={handleInputChange} required />
                </div>

                <div className="password-section">
                  <h3 className="password-section-title">Change Password</h3>
                  <p className="password-section-subtitle">
                    Leave blank to keep your current password. New password needs 8+ chars, 1 uppercase, 1 number.
                  </p>

                  <div className="form-group">
                    <label htmlFor="currentPassword">Current Password</label>
                    <input type="password" id="currentPassword" name="currentPassword" value={formData.currentPassword} onChange={handleInputChange} placeholder="Enter current password" />
                  </div>

                  <div className="form-group">
                    <label htmlFor="newPassword">New Password</label>
                    <input type="password" id="newPassword" name="newPassword" value={formData.newPassword} onChange={handleInputChange} placeholder="Enter new password" />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm New Password</label>
                    <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} placeholder="Confirm new password" />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit" disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default UserProfile;
