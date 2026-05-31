import React, { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { SignupFormInputs } from "./type";
import { useAuth } from "../../context/AuthContext";
import "./signup.css";

interface SignupForm extends SignupFormInputs {
  fullName: string;
}

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [formData, setFormData] = useState<SignupForm>({
    username: "",
    email: "",
    password: "",
    fullName: "",
  });
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const validateEmail = (email: string): boolean =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!validateEmail(formData.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      await register(
        formData.username.trim(),
        formData.email.trim(),
        formData.password,
        formData.fullName.trim()
      );
      // register auto-logs the user in (token stored), go straight to the app.
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  };

  return (
    <div className="signupContainer">
      <div className="userIndicator">Task Manager</div>
      <div className="signupHeader">
        <div className="iconContainer">
          <svg className="iconEnvelope" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
        </div>
        <h1 className="title">Create Account</h1>
        <p className="subtitle">Join our task management platform</p>
      </div>

      <div className="signupCard">
        <form onSubmit={handleSubmit} className="signupForm">
          <div className="formGroup">
            <label htmlFor="fullName" className="label">Full name</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="input"
              placeholder="Your full name"
              required
            />
          </div>

          <div className="formGroup">
            <label htmlFor="username" className="label">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="input"
              placeholder="Choose a username"
              required
            />
          </div>

          <div className="formGroup">
            <label htmlFor="email" className="label">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="input"
              placeholder="your@email.com"
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
              placeholder="At least 8 characters"
              required
            />
          </div>

          {error && <div className="errorMessage">{error}</div>}

          <button type="submit" className="signUpButton" disabled={loading}>
            {loading ? "Creating..." : "Sign Up"}
          </button>

          <div className="signInPrompt">
            Already have an account? <Link to="/login" className="signInLink">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;
