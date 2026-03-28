import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/http-api-client";
import DeleteModal from 'ts-front-end/src/legacy/components/DeleteModal.jsx';
import avatar from "../icons/avatar.svg";
import {
  Trash2,
  FileText,
  Plus,
  AlertTriangle,
  Pencil,
  X,
  Check,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";
import " ts-front-end/src/legacy/css/StudentPage.css";

// Types
export interface Timeline {
  _id: string;
  name: string;
  degreeId: string;
  isCoop: boolean;
  isExtendedCredit: boolean;
  last_modified?: string;
}

interface UserTimelinesResponse {
  user: {
    _id: string;
    email: string;
    fullname: string;
    type: string;
  };
  timelines: Timeline[];
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// StudentPage

const StudentPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // data 
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // timeline delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [timelineToDelete, setTimelineToDelete] = useState<Timeline | null>(null);

  // name edit 
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);

  // password change 
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // fetch 
  const fetchUserTimelines = async () => {
    try {
      if (user?.id) {
        const data = await api.get<UserTimelinesResponse>(`/users/${user.id}/data`);
        setTimelines(data.timelines);
        setDisplayName(data.user.fullname ?? user.name ?? "");
        setUserEmail(data.user.email ?? user.email ?? "");
        setNameInput(data.user.fullname ?? user.name ?? "");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const redirect = localStorage.getItem("redirectAfterLogin");
    localStorage.removeItem("redirectAfterLogin");
    if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
      navigate(redirect, { replace: true });
    }

    fetchUserTimelines();
  }, [isAuthenticated, navigate, user]);

  // timeline handlers 
  const handleTimelineClick = async (obj: Timeline) => {
    try {
      const response = await api.get<{ jobId?: string }>(`/timeline/${obj._id}`);
      if (response?.jobId) {
        navigate(`/timeline/${response.jobId}`);
        return;
      }
      alert("Unexpected response from server.");
    } catch (error) {
      console.error("Error loading timeline:", error);
      alert(error instanceof Error ? error.message : "An unknown error occurred.");
    }
  };

  const handleDeleteClick = (timeline: Timeline) => {
    setTimelineToDelete(timeline);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async (timeline_id: string) => {
    try {
      await api.delete(`/timeline/${timeline_id}`);
      setTimelines((prev) => prev.filter((t) => t._id !== timeline_id));
    } catch (e) {
      console.error("Error deleting timeline:", e);
    }
  };

  // name handlers
  const handleNameSave = async () => {
    setNameError(null);
    if (!nameInput.trim()) {
      setNameError("Name cannot be empty.");
      return;
    }
    setNameLoading(true);
    try {
      // TODO: wire to PATCH /users/:id once backend route is added
      await api.patch(`/users/${user?.id}`, { fullname: nameInput.trim() });
      setDisplayName(nameInput.trim());
      setIsEditingName(false);
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Failed to update name.");
    } finally {
      setNameLoading(false);
    }
  };

  const handleNameCancel = () => {
    setIsEditingName(false);
    setNameInput(displayName);
    setNameError(null);
  };

  // password handlers
  const handlePasswordSave = async () => {
    setPasswordError(null);
    if (!passwordForm.currentPassword) {
      setPasswordError("Current password is required.");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordLoading(true);
    try {
      // TODO: wire to PATCH /users/:id (changePassword) once backend route is added
      await api.patch(`/users/${user?.id}`, {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess(true);
      setShowPasswordSection(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordSection(false);
    setPasswordError(null);
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  // guard 
  if (!isAuthenticated) {
    return <p className="text-center mt-5">Please log in to see your data.</p>;
  }

  //  render 
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
    >
      <div className="sp-container">
        <div className="sp-layout">

          {/*  Left: Profile card  */}
          <aside className="sp-sidebar">
            <div className="sp-profile-card">

              {/* Red header band with avatar overlapping */}
              <div className="sp-card-header">
                <div className="sp-avatar-wrap">
                  <img src={avatar} alt="Profile Avatar" className="sp-avatar" />
                </div>
              </div>

              <div className="sp-card-body">
                {/* Name + role */}
                <div className="sp-identity">
                  <h2 className="sp-display-name">{displayName || "Full Name"}</h2>
                  <span className="sp-role-badge">{user?.role || "Student"}</span>
                </div>

                {/* Info rows */}
                <div className="sp-info-rows">

                  {/* Name row */}
                  <div className="sp-info-row">
                    <span className="sp-info-label">Full Name</span>
                    <AnimatePresence mode="wait">
                      {!isEditingName ? (
                        <motion.div
                          key="view"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="sp-info-value-row"
                        >
                          <span className="sp-info-value">{displayName || "—"}</span>
                          <button
                            className="sp-icon-btn"
                            onClick={() => { setIsEditingName(true); setNameError(null); }}
                            title="Edit name"
                          >
                            <Pencil size={14} />
                          </button>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="edit"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="sp-inline-edit"
                        >
                          <input
                            type="text"
                            className="sp-input"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                            autoFocus
                          />
                          <div className="sp-inline-actions">
                            <button
                              className="sp-btn-confirm"
                              onClick={handleNameSave}
                              disabled={nameLoading}
                              title="Save"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              className="sp-btn-cancel-icon"
                              onClick={handleNameCancel}
                              disabled={nameLoading}
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {nameError && <p className="sp-field-error">{nameError}</p>}
                  </div>

                  {/* Email row */}
                  <div className="sp-info-row">
                    <span className="sp-info-label">Email</span>
                    <span className="sp-info-value">{userEmail || "—"}</span>
                  </div>
                </div>

                {/* Success banners */}
                <AnimatePresence>
                  {nameSuccess && (
                    <motion.p
                      className="sp-success-msg"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      Name updated successfully.
                    </motion.p>
                  )}
                  {passwordSuccess && (
                    <motion.p
                      className="sp-success-msg"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      Password changed successfully.
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Change password*/}
                <div className="sp-password-section">
                  <button
                    className="sp-password-toggle"
                    onClick={() => {
                      setShowPasswordSection((v) => !v);
                      setPasswordError(null);
                    }}
                  >
                    <span className="sp-password-toggle-left">
                      <Lock size={14} />
                      Change Password
                    </span>
                    {showPasswordSection ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  <AnimatePresence>
                    {showPasswordSection && (
                      <motion.div
                        key="pwd"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        style={{ overflow: "hidden" }}
                      >
                        <div className="sp-password-form">
                          <div className="sp-field">
                            <label className="sp-label">Current Password</label>
                            <input
                              type="password"
                              className="sp-input"
                              value={passwordForm.currentPassword}
                              onChange={(e) =>
                                setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
                              }
                            />
                          </div>
                          <div className="sp-field">
                            <label className="sp-label">New Password</label>
                            <input
                              type="password"
                              className="sp-input"
                              value={passwordForm.newPassword}
                              onChange={(e) =>
                                setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
                              }
                            />
                          </div>
                          <div className="sp-field">
                            <label className="sp-label">Confirm New Password</label>
                            <input
                              type="password"
                              className="sp-input"
                              value={passwordForm.confirmPassword}
                              onChange={(e) =>
                                setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
                              }
                            />
                          </div>

                          {passwordError && (
                            <p className="sp-field-error">{passwordError}</p>
                          )}

                          <div className="sp-form-actions">
                            <button
                              className="sp-btn-primary"
                              onClick={handlePasswordSave}
                              disabled={passwordLoading}
                            >
                              {passwordLoading ? "Saving…" : "Update Password"}
                            </button>
                            <button
                              className="sp-btn-ghost"
                              onClick={handlePasswordCancel}
                              disabled={passwordLoading}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

              </div>
            </div>
          </aside>

          {/* Right side: Timelines for now */}
          <main className="sp-main">
            <h2 className="sp-section-title">My Timelines</h2>

            {timelines.length === 0 ? (
              <div className="sp-empty-state">
                <p>You haven't saved any timelines yet.</p>
                <Link to="/timeline" className="sp-btn-primary sp-empty-cta">
                  Start Your First Timeline
                </Link>
              </div>
            ) : (
              <div className="sp-timeline-list">
                {timelines.map((obj) => (
                  <div key={obj._id} className="sp-timeline-item">
                    <div
                      className="sp-timeline-info"
                      onClick={() => handleTimelineClick(obj)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleTimelineClick(obj);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <span className="sp-timeline-name">{obj.name}</span>
                      {obj.last_modified && (
                        <span className="sp-timeline-meta">
                          Modified {moment(obj.last_modified).fromNow()}
                        </span>
                      )}
                    </div>
                    <div className="sp-timeline-actions">
                      <button
                        className="sp-btn-audit"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/degree-audit/${obj._id}`);
                        }}
                        title="Degree Assessment"
                      >
                        <FileText size={14} />
                        <span className="sp-btn-audit-label">Assessment</span>
                      </button>
                      <button
                        className="sp-btn-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(obj);
                        }}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                <Link to="/timeline" className="sp-timeline-add">
                  <Plus size={18} />
                  <span>Create New Timeline</span>
                </Link>
              </div>
            )}
          </main>

        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <DeleteModal open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
          <div className="modal-content-clean">
            <div className="modal-icon-container">
              <AlertTriangle size={32} />
            </div>
            <h3 className="modal-title">Delete Timeline?</h3>
            <p className="modal-body-text">
              This will permanently remove <strong>{timelineToDelete?.name}</strong>. This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-modal-cancel" onClick={() => setShowDeleteModal(false)}>
                Keep it
              </button>
              <button
                className="btn-modal-delete"
                onClick={() => {
                  if (timelineToDelete) handleDeleteConfirm(timelineToDelete._id);
                  setShowDeleteModal(false);
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </DeleteModal>
      )}
    </motion.div>
  );
};

export default StudentPage;