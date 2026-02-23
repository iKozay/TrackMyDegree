import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/http-api-client";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Trash2, FileText, AlertTriangle } from "lucide-react";
import DeleteModal from "../legacy/components/DeleteModal";
import '../styles/components/UserTimelinesSection.css';
import moment from "moment";

export interface Timeline {
  _id: string;
  name: string;
  degreeId: string;
  isCoop: boolean;
  isExtendedCredit: boolean;
  last_modified?: string;
}

interface TimelineResponse {
  jobId: string;
}

const UserTimelinesSection: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [timelineToDelete, setTimelineToDelete] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchTimelines = async () => {
      try {
        const data = await api.get<{ timelines: Timeline[] }>(`/users/${user?.id}/data`);
        setTimelines(data.timelines);
      } catch (err) {
        console.error(err);
        setError("Cannot get timelines.");
      } finally {
        setLoading(false);
      }
    };

    fetchTimelines();
  }, [isAuthenticated, user]);

  const handleTimelineClick = async (obj: Timeline) => {
    try {
      const response = await api.get<TimelineResponse>(`/timeline/${obj._id}`);
      if (response?.jobId) {
        navigate(`/timeline/${response.jobId}`);
        return;
      }
      alert("Unexpected response from server.");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Unknown error.");
    }
  };

  const handleDeleteClick = (timeline: Timeline) => {
    setTimelineToDelete(timeline);
    setShowModal(true);
  };

  const handleDelete = async (timeline_id: string) => {
    try {
      await api.delete(`/timeline/${timeline_id}`);
      setTimelines((prev) => prev.filter((t) => t._id !== timeline_id));
    } catch (err) {
      console.error(err);
      alert("Error deleting timeline.");
    }
  };

  return (
    <motion.div 
      className="user-timelines-section"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 0.7 }}
    >
      <h2>My Timelines</h2>

      {!isAuthenticated ? (
        <div className="timeline-login">
        <p className="timeline-error">Please log in to see your timelines.</p>
        </div>
        ) : (
        <>
            {loading && <p className="timeline-loading">Loading timelines...</p>}
            {error && <p className="timeline-error">{error}</p>}

            {!loading && !error && timelines.length === 0 && (
                <div className="timeline-empty">
                <p>You haven't saved any timelines yet.</p>
                </div>
            )}

            {!loading && !error && timelines.length > 0 && (
                <div className="timeline-list">
                {timelines.map((t) => (
                    <div key={t._id} className="timeline-card">
                    <div
                        className="timeline-info"
                        onClick={() => handleTimelineClick(t)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if(e.key === "Enter" || e.key === " ") handleTimelineClick(t); }}
                    >
                        <h4>{t.name}</h4>
                        {t.last_modified && <p className="timeline-date">Modified {moment(t.last_modified).fromNow()}</p>}
                    </div>
                    <div className="timeline-actions">
                        <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/degree-audit/${t._id}`); }}
                        className="btn-assessment"
                        title="Degree Assessment"
                        >
                        <FileText size={16} /> Assessment
                        </button>
                        <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(t); }}
                        className="btn-delete"
                        title="Delete Timeline"
                        >
                        <Trash2 size={16} />
                        </button>
                    </div>
                    </div>
                ))}
                </div>
            )}

            {showModal && timelineToDelete && (
                <DeleteModal open={showModal} onClose={() => setShowModal(false)}>
                <div className="delete-modal-content">
                    <div className="modal-icon"><AlertTriangle size={32} /></div>
                    <h3>Delete Timeline?</h3>
                    <p>This will permanently remove <strong>{timelineToDelete.name}</strong>. This action cannot be undone.</p>
                    <div className="modal-actions">
                    <button className="btn-cancel-modal" onClick={() => setShowModal(false)}>Keep it</button>
                    <button className="btn-delete-modal" onClick={() => { handleDelete(timelineToDelete._id); setShowModal(false); }}>Yes, Delete</button>
                    </div>
                </div>
                </DeleteModal>
            )}
        </>
        )}
    </motion.div>
  );
};

export default UserTimelinesSection;