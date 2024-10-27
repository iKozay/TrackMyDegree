import React from "react";
import "./Hero.css";

const Hero = () => {
  return (
    <section className="hero text-center my-5">
      <h1 className="hero-title">Organize your course sequence</h1>
      <p className="hero-subtitle">Try Now</p>
      <button className="btn btn-outline-dark btn-lg hero-button">
        Live Demo{" "}
        <span role="img" aria-label="play">
          ▶️
        </span>
      </button>
    </section>
  );
};

export default Hero;
