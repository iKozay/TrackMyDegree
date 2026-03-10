import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/UserPage.css';
import { motion } from 'framer-motion';
import moment from 'moment';
import { api } from '../../api/http-api-client';
import avatar from '../../icons/avatar.svg';
import { useNavigate } from "react-router-dom";

import DeleteModal from '../components/DeleteModal.jsx';
import { Trash2, FileText, Plus, AlertTriangle } from 'lucide-react';

const UserPage = (prop) => {
  const navigate = useNavigate();
  const user = prop.student || {};
  const [userTimelines, setUserTimelines] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [timelineToDelete, setTimelineToDelete] = useState(null);
  useEffect(() => {
    if (prop.timelines) {
      setUserTimelines(prop.timelines);
    }
  }, [prop.timelines]);

  const handleTimelineClick = async (obj) => {
    try {
      const response = await api.get(`/timeline/${obj._id}`);
      if (response?.jobId) {
        navigate(`/timeline/${response.jobId}`);
        return;
      }

      alert("Unexpected response from server.");
    } catch (error) {
      console.error("Error processing loading from db:", error);
      const message =
        error instanceof Error
          ? error.message
          : "An unknown error occurred while processing the form.";
      alert(message);
    }
  };

  // Delete timeline handler using utils
  const handleDeleteClick = (timeline) => {
    setTimelineToDelete(timeline);
    setShowModal(true);
  };

  const handleDelete = async (timeline_id) => {
    try {
      await api.delete(`/timeline/${timeline_id}`);
      setUserTimelines((prev) => prev.filter((obj) => obj._id !== timeline_id));
    } catch (e) {
      console.error('Error deleting timeline:', e);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <div className="container py-4">
        <div className="row min-vh-100 g-4">
          {/* Left Side - Profile */}
          <div className="col-12 col-lg-5 d-flex flex-column align-items-center">
            <h2 className="mb-4 text-center w-100">My Profile</h2>
            <div className="d-flex w-100 justify-content-center align-items-start">
              <div className="card shadow-sm border-0 w-100" style={{ maxWidth: '400px' }}>
                <div className="card-body p-4 text-center">
                  <div className="mb-4">
                    <img
                      className="rounded-circle shadow-sm"
                      src={avatar}
                      alt="Profile Avatar"
                      style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                    />
                  </div>
                  <h3 className="h4 mb-1 fw-bold text-dark">
                    {user.name || 'Full Name'}
                  </h3>
                  <p className="text-muted small mb-4">{user.role || 'Student'}</p>
                  
                  <div className="text-start">
                    <div className="d-flex justify-content-between py-2 border-bottom">
                      <span className="text-muted small fw-bold">Full Name</span>
                      <span className="small">{user.name || 'N/A'}</span>
                    </div>
                    <div className="d-flex justify-content-between py-2">
                      <span className="text-muted small fw-bold">Email</span>
                      <span className="small">{user.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="separator-line d-none d-lg-block"></div>
            </div>
          </div>

          {/* Right Side - My Timelines */}
          <div className="col-12 col-lg-7">
            <h2 className="mb-4 text-center text-lg-start">My Timelines</h2>
            <div className="mx-auto mx-lg-0" style={{ maxWidth: '750px' }}>
              {userTimelines.length === 0 ? (
                <div className="text-center py-5 bg-light rounded-3">
                  <p className="text-muted mb-3">You haven't saved any timelines yet.</p>
                  <Link to="/timeline" className="btn btn-outline-primary rounded-pill px-4">
                    Start Your First Timeline
                  </Link>
                </div>
              ) : (
                <div className="list-group gap-2">
                  {userTimelines.map((obj) => (
                    <div
                      key={obj._id || obj.id}
                      className="timeline-box d-flex align-items-center justify-content-between px-3 py-3"
                    >
                      <div
                        className="timeline-info flex-grow-1 text-start"
                        onClick={() => handleTimelineClick(obj)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleTimelineClick(obj);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="timeline-text mb-0">{obj.name}</div>
                        <div className="timeline-text small" style={{ fontSize: '0.8rem' }}>
                          Modified {moment(obj.last_modified).fromNow()}
                        </div>
                      </div>
                      <div className="timeline-actions d-flex gap-2 align-items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/degree-audit/${obj._id}`);
                          }}
                          className="btn btn-audit d-flex align-items-center gap-2"
                          title="Degree Assessment"
                        >
                          <FileText size={14} />
                          <span className="d-none d-sm-inline">Assessment</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(obj);
                          }}
                          className="btn-delete-icon d-flex align-items-center justify-content-center rounded-circle"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <Link to="/timeline" className="timeline-add text-decoration-none transition-all">
                    <Plus size={20} />
                    <span>Create New Timeline</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete Modal */}
        {showModal && (
          <DeleteModal open={showModal} onClose={() => setShowModal(false)}>
            <div className="modal-content-clean">
              <div className="modal-icon-container">
                <AlertTriangle size={32} />
              </div>
              <h3 className="modal-title">Delete Timeline?</h3>
              <p className="modal-body-text">
                This will permanently remove <strong>{timelineToDelete?.name}</strong>. This action cannot be undone.
              </p>
              <div className="modal-actions">
                <button
                  className="btn-modal-cancel"
                  onClick={() => setShowModal(false)}
                >
                  Keep it
                </button>
                <button
                  className="btn-modal-delete"
                  onClick={() => {
                    handleDelete(timelineToDelete?._id);
                    setShowModal(false);
                  }}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </DeleteModal>
        )}
      </div>
    </motion.div>
  );
};

export default UserPage;
