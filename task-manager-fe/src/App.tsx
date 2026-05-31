import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import "./utils/api"; // installs the global fetch interceptor (auth header + /api/v1 + 401)
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastProvider } from "./components/ToastProvider";
import Login from "./components/authentication/login";
import Signup from "./components/authentication/signup";
import ForgotPassword from "./components/authentication/forgotpassword";
import Dashboard from "./page/dashboard";
import Tasks from "./page/task";
import TaskDetail from "./page/taskdetail";
import Team from "./page/team";
import Trash from "./page/trash";
import UserProfile from "./page/userprofile";

const protect = (el: React.ReactNode) => <ProtectedRoute>{el}</ProtectedRoute>;

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/dashboard" element={protect(<Dashboard />)} />
            <Route path="/tasks" element={protect(<Tasks />)} />
            <Route path="/tasks/:taskId" element={protect(<TaskDetail />)} />
            <Route path="/team" element={protect(<Team />)} />
            <Route path="/trash" element={protect(<Trash />)} />
            <Route path="/profile" element={protect(<UserProfile />)} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
