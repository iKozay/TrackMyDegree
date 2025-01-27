// src/components/TimelineSection.js
import React from "react";
import TimelineExample from "../images/TimelineExample.png";
import '../css/TimelineSection.css';

const TimelineSection = () => {
  return (
    <section className="timeline-section text-center my-5">
      <div className="timeline-placeholder">
        {/* <p>Put image of timeline here</p>
        <p>Also this should link to the timeline page</p> */}
        <img src={TimelineExample} alt="timeline" />
      </div>
    </section>
  );
};

export default TimelineSection;
