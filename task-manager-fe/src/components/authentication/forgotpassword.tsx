import React from "react";
import { Link } from "react-router-dom";
import "./forgotpassword.css";

const ForgotPassword: React.FC = () => {
  return (
    <div className="forgotPasswordContainer">
      <div className="forgotPasswordHeader">
        <div className="iconContainer">
          <svg
            className="iconEnvelope"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 7l9 6 9-6" />
          </svg>
        </div>
        <h1 className="title">Forgot Password</h1>
        <p className="subtitle">
          Please contact your manager or system administrator to update your
          password
        </p>
        <Link to="/login" className="backToLoginButton">
          Back to Login
        </Link>
      </div>

    </div>
  );
};

export default ForgotPassword;
