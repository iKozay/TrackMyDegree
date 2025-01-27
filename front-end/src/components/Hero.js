import React from "react";
import '../css/Hero.css';
import { useNavigate } from "react-router-dom";

const Hero = () => {

  const navigate = useNavigate();

  return (
    <section className="hero text-center my-5">
      <h1 className="hero-title">Organize your course sequence</h1>
      <p className="hero-subtitle">Try Now</p>
      <button className="btn btn-outline-dark btn-lg hero-button" onClick={() => navigate("/timeline_change")}>
        Live Demo{" "}
        <span role="img" aria-label="play">
          ▶️
        </span>
      </button>
    </section>
  );
};

export default Hero;
