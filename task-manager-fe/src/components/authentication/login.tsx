import React, { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { LoginFormInputs } from "./type";
import { useAuth } from "../../context/AuthContext";
import "./login.css";

const DEMO_ACCOUNTS = [
  { username: "admin", label: "Admin" },
  { username: "leader_an", label: "Group Leader" },
  { username: "member_hoa", label: "Member" },
];

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginFormInputs>({
    username: "admin",
    password: "",
  });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.username.trim()) {
      setError("Username is required");
      return;
    }
    if (!formData.password.trim()) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    try {
      await login(formData.username.trim(), formData.password.trim());
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
      setLoading(false);
    }
  };

  return (
    <div className="loginContainer">
      <div className="userIndicator">Task Manager</div>
      <div className="loginHeader">
        <div className="iconContainer">
          <svg className="iconEnvelope" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
        </div>
        <h1 className="title">Welcome Back</h1>
        <p className="subtitle">Manage your team's tasks efficiently</p>
      </div>

      <div className="loginCard">
        <form onSubmit={handleSubmit} className="loginForm">
          <div className="formGroup">
            <label htmlFor="username" className="label">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div className="formGroup">
            <label htmlFor="password" className="label">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div className="errorMessage">{error}</div>}

          <button type="submit" className="signInButton" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>

          <Link to="/forgot-password" className="forgotPasswordLink">
            Forgot password?
          </Link>

          <div className="signUpPrompt">
            Don't have an account? <Link to="/signup" className="signUpLink">Sign up</Link>
          </div>

          <div className="demoCredentials">
            <div className="demoCredentialsTitle">Demo accounts (password: Password123)</div>
            {DEMO_ACCOUNTS.map((a) => (
              <div
                key={a.username}
                className="demoCredentialsText"
                style={{ cursor: "pointer" }}
                onClick={() => setFormData({ username: a.username, password: "Password123" })}
              >
                <strong>{a.username}</strong> — {a.label}
              </div>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
