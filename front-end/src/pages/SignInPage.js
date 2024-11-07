// src/pages/SignInPage.js
import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../AuthContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "bootstrap/dist/css/bootstrap.min.css";
import Button from 'react-bootstrap/Button';

function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    
    // Basic email and password validation (can be replaced with more robust logic)
    if (email === "admin@gmail.com" && password === "admin") {
      login();
      navigate("/user");
    } else {
      alert("Invalid email or password. Please try again.");
    }
  };

  return (
    <div className="SignInPage">
      <div className="container my-5 sign-in-container">
        <h2 className="text-center mb-4">Log In</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label htmlFor="email" className="form-label">Email address</label>
            <input 
              type="email" 
              className="form-control" 
              id="email" 
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="mb-5">
            <label htmlFor="password" className="form-label">Password</label>
            <input 
              type="password" 
              className="form-control" 
              id="password" 
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="d-grid gap-2">
            <Button className="button-outline" variant="light" type="submit">Submit</Button>
          </div>
        </form>
        <div className="text-center mt-3">
          <a href="/signup">Don't have an account? Register here!</a>
        </div>
      </div>
    </div>
  );
}

export default SignInPage;
