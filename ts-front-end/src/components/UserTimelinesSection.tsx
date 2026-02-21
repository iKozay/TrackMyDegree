import React, { useEffect, useState } from "react";
import { api } from "../api/http-api-client.ts";
import { useAuth } from "../hooks/useAuth";
import { motion } from "framer-motion";
import { FileText, Trash2, Plus } from "lucide-react";
import "../styles/components/UserTimelinesSection.css";
import { useNavigate } from "react-router-dom";

export interface Timeline {
  _id: string;
  name: string;
  degreeId: string;
  isCoop: boolean;
  isExtendedCredit: boolean;
  last_modified?: string;
}

const UserTimelinesSection: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchTimelines = async () => {
      if (!isAuthenticated || !user?.id) return;

      try {
        const data = await api.get<{ timelines: Timeline[] }>(
          `/users/${user.id}/data`
        );
        setTimelines(data.timelines);
      } catch (err) {
        console.error(err);
        setError("Cannot fetch timelines at this time.");
      }
    };
    fetchTimelines();
  }, [isAuthenticated, user]);

  const handleOpen = (timeline: Timeline) => {
    navigate(`/timeline/${timeline._id}`);
  };

  return (
    <section className="my-timelines-section">
      <h2 className="timelines-header">My Timelines</h2>

      {!isAuthenticated ? (
        <p className="timelines-message">Please log in to view your timelines.</p>
      ) : error ? (
        <p className="timelines-message">{error}</p>
      ) : timelines.length === 0 ? (
        <div className="no-timelines">
          <p>You haven’t created any timelines yet.</p>
          <button
            className="btn-primary"
            onClick={() => navigate("/timeline")}
          >
            Start Your First Timeline
          </button>
        </div>
      ) : (
        <div className="timelines-container">
          {timelines.map((timeline, idx) => (
            <motion.div
              key={timeline._id}
              className="timeline-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, type: "spring", stiffness: 100 }}
              whileHover={{ scale: 1.03, boxShadow: "0 20px 40px rgba(139,21,56,0.2)" }}
            >
              <div className="timeline-info" onClick={() => handleOpen(timeline)}>
                <h3 className="timeline-name">{timeline.name}</h3>
                <p className="timeline-meta">
                  {timeline.isCoop ? "Co-op, " : ""}
                  {timeline.isExtendedCredit ? "Extended Credit" : ""}
                </p>
                {timeline.last_modified && (
                  <p className="timeline-date">
                    Last Modified: {new Date(timeline.last_modified).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="timeline-actions">
                <button
                  className="btn-icon"
                  onClick={() => navigate(`/degree-audit/${timeline._id}`)}
                  title="Degree Assessment"
                >
                  <FileText size={18} />
                </button>
                <button
                  className="btn-icon btn-delete"
                  onClick={() => alert("Delete functionality coming soon")}
                  title="Delete Timeline"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
          <motion.button
            className="btn-add-timeline"
            onClick={() => navigate("/timeline")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: timelines.length * 0.1 }}
          >
            <Plus size={20} />
            <span>Create New Timeline</span>
          </motion.button>
        </div>
      )}
    </section>
  );
};

export default UserTimelinesSection;