// src/components/TimelineSection.js
import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import TimelineSection from "../components/TimelineSection";
import Footer from "../components/Footer";
import {motion} from "framer-motion"

const LandingPage = () => {
  return (
    <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.7 }}
  >
    <section className="">
      <div className="">
      <Hero />
      {/* <TimelineSection /> */}
      </div>
    </section>
    </motion.div>
  );
};

export default LandingPage;
