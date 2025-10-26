// src/pages/UserPage.js
import React, { useState, useContext, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../middleware/AuthContext';
import moment from 'moment';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/UserPage.css';
import { motion } from 'framer-motion';

import DeleteModal from '../components/DeleteModal';
import TrashLogo from '../icons/trashlogo';
import { UserPageError } from '../middleware/SentryErrors';

const UserPage = ({ onDataProcessed }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [userInfo, setUserInfo] = useState([]);
  const [userTimelines, setUserTimelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [timelineToDelete, setTimelineToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Sync profile table when user changes
  useEffect(() => {
    if (!user) return;
    setUserInfo([
      { title: 'Full Name', value: user.fullname || 'NULL' },
      { title: 'Email', value: user.email || 'NULL' },
    ]);
  }, [user]);

  // Redirect to login if no user
  useEffect(() => {
    if (user === null || user === undefined) return; // wait until context resolves
    if (!user) navigate('/signin');
  }, [user, navigate]);

  // Fetch degree credits
  const getDegreeCredits = useCallback(async (degreeId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_SERVER}/degree/getCredits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ degreeId }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new UserPageError(errorData.message || 'Failed to fetch degree credits.');
      }
      const data = await response.json();
      return data;
    } catch (e) {
      console.error('Error fetching degree credits:', e);
      return null;
    }
  }, []);

  // Open a timeline
  const handleTimelineClick = useCallback(
    async (obj) => {
      if (!obj) return;
      localStorage.setItem('Timeline_Name', obj.name); // single write (no JSON stringify needed)

      const degreeId = obj.degree_id;
      const items = Array.isArray(obj.items) ? obj.items : [];
      let creditsRequired = await getDegreeCredits(degreeId);
      if (!creditsRequired) {
        console.warn('Falling back to 120 credits (could not fetch)');
        creditsRequired = 120;
      }

      const transcriptData = items.map(({ season, year, courses }) => ({
        term: `${season} ${year}`,
        courses: courses || [],
        grade: 'A',
      }));

      onDataProcessed({
        transcriptData,
        degreeId,
        creditsRequired,
        isExtendedCredit: !!obj.isExtendedCredit,
      });

      navigate('/timeline_change');
    },
    [getDegreeCredits, navigate, onDataProcessed],
  );

  // Load timelines (students only)
  useEffect(() => {
    if (!user || user.type !== 'student') {
      setUserTimelines([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        setErrorMsg('');

        const response = await fetch(`${process.env.REACT_APP_SERVER}/timeline/getAll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new UserPageError(errorData.message || 'Failed to fetch user timelines.');
        }

        const data = await response.json();
        if (Array.isArray(data)) {
          const sorted = data.slice().sort((a, b) => new Date(b.last_modified) - new Date(a.last_modified));
          setUserTimelines(sorted);
        } else {
          setUserTimelines([]);
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
        console.error('Error loading timelines:', e);
        setErrorMsg('Could not load timelines. Please try again.');
        setUserTimelines([]);
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [user]);

  const handleDeleteClick = (timeline) => {
    setTimelineToDelete(timeline);
    setShowModal(true);
  };

  const handleDelete = async (timeline_id) => {
    if (!timeline_id) return;
    setDeletingId(timeline_id);
    try {
      const response = await fetch(`${process.env.REACT_APP_SERVER}/timeline/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeline_id }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new UserPageError(errorData.message || 'Failed to delete user timeline.');
      }

      // Functional update to avoid stale state
      setUserTimelines((prev) => prev.filter((obj) => obj.id !== timeline_id));
    } catch (e) {
      console.error('Error deleting user timeline:', e);
      setErrorMsg('Failed to delete timeline. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!user) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <div className="container-fluid">
        <div className="row vh-100">
          {/* Left: Profile */}
          <div className="col-12 col-md-4 d-flex flex-column align-items-center text-center mx-auto">
            <h2 className="mb-4">My Profile</h2>
            <div className="profile-container d-flex">
              <div className="max-w-sm w-full">
                <div className="bg-white shadow-xl rounded-lg py-4">
                  <div className="photo-wrapper p-3">
                    <img
                      className="w-40 h-40 rounded-full mx-auto"
                      src="https://www.svgrepo.com/download/374554/avatar-loading.svg"
                      alt="Profile Avatar"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="text-center text-2xl text-gray-900 font-medium leading-8">
                      {user.fullname || 'Full Name'}
                    </h3>
                    <div className="text-center text-gray-400 text-sm font-semibold">
                      <p>{user.type || 'User'}</p>
                    </div>
                    <table className="text-sm my-4">
                      <tbody>
                        {userInfo.map((row) => (
                          <tr key={row.title}>
                            <td className="px-3 py-2 text-gray-500 font-semibold">{row.title}</td>
                            <td className="px-3 py-2">{row.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="separator-line"></div>
            </div>
          </div>

          {/* Right: Timelines */}
          <div className="col-12 col-md-6 d-flex flex-column text-center mx-auto mt-3 mt-md-0">
            <h2 className="mb-5">My Timelines</h2>

            {loading ? (
              <p className="text-muted">Loading timelines…</p>
            ) : errorMsg ? (
              <div className="alert alert-warning" role="alert">
                {errorMsg}
              </div>
            ) : userTimelines.length === 0 ? (
              <Link to="/timeline_initial">
                <p>You haven&apos;t saved any timelines yet, click here to start now!</p>
              </Link>
            ) : (
              <div className="list-group">
                {userTimelines.map((obj) => (
                  <div key={obj.id} className="timeline-box d-flex align-items-center justify-content-between">
                    {/* Make the timeline name clickable */}
                    <button
                      type="button"
                      className="timeline-link btn btn-link text-decoration-none text-start flex-grow-1"
                      onClick={() => handleTimelineClick(obj)}
                      aria-label={`Open timeline ${obj.name}`}
                    >
                      <span className="timeline-text d-block">{obj.name}</span>
                      <span className="timeline-text d-block">
                        Last Modified: {moment(obj.last_modified).format('MMM DD, YYYY h:mm A')}
                      </span>
                    </button>

                    {/* Delete button (stop propagation so it doesn't open the timeline) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(obj);
                      }}
                      className="timeline-delete btn btn-lg p-0 border-0 bg-transparent"
                      aria-label={`Delete timeline ${obj.name}`}
                      disabled={deletingId === obj.id}
                    >
                      <TrashLogo size={25} className="me-1 text-danger" />
                    </button>
                  </div>
                ))}

                {/* Add New Timeline Button */}
                <Link to="/timeline_initial" className="timeline-add" aria-label="Create new timeline">
                  <span className="timeline-text">+</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Delete Confirm Modal */}
        <DeleteModal open={showModal} onClose={() => setShowModal(false)}>
          <div className="tw-text-center tw-w-56">
            <TrashLogo size={56} className="tw-mx-auto tw-text-red-500" />
            <div className="tw-mx-auto tw-my-4 tw-w-48">
              <h3 className="tw-text-lg tw-font-black tw-text-gray-800">Confirm Delete</h3>
              <p className="tw-text-sm tw-text-gray-500">
                Are you sure you want to delete &quot;{timelineToDelete?.name}&quot;?
              </p>
            </div>
            <div className="tw-flex tw-gap-4">
              <button
                className="btn btn-danger tw-w-full"
                disabled={!timelineToDelete || deletingId === timelineToDelete?.id}
                onClick={() => {
                  if (timelineToDelete?.id) handleDelete(timelineToDelete.id);
                  setShowModal(false);
                }}
              >
                {deletingId === timelineToDelete?.id ? 'Deleting…' : 'Delete'}
              </button>
              <button className="btn btn-light tw-w-full" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </DeleteModal>
      </div>
    </motion.div>
  );
};

export default UserPage;
