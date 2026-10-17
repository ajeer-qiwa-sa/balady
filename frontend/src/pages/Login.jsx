import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

import { API_URL } from "../api";

function Login() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(`${API_URL}/api/login`, {
        username,
        password,
      });

      localStorage.setItem("token", res.data.token);
      document.cookie = `token=${res.data.token}; path=/; max-age=28800; SameSite=Lax`;
      navigate("/dashboard");

    } catch (err) {
      setError("اسم المستخدم أوو كلمة السر غير صحيحة");
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleLogin} className="login-box">
        <h2>تسجيل الدخول</h2>

        <div className="login-form">
          <input
            type="text"
            placeholder="اسم المستخدم"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="password"
            placeholder="كلمة السر"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="login-btn">دخول</button>
        </div>
      </form>
    </div>
  );
}

export default Login;
