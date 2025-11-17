import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../middleware/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/UserPage.css';
import { motion } from 'framer-motion';
import moment from 'moment';

import DeleteModal from '../components/DeleteModal';
import TrashLogo from '../icons/trashlogo';
import { UserPageError } from '../middleware/SentryErrors';

// ===import helper functions from utils ===
import { getDegreeCredits, getUserTimelines, deleteTimelineById, buildTranscriptData } from '../api/UserPageApi';

const UserPage = ({ onDataProcessed }) => {
  const { user } = useContext(AuthContext);
  const [userInfo, setUserInfo] = useState([]);
  const [userTimelines, setUserTimelines] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [timelineToDelete, setTimelineToDelete] = useState(null);
  const navigate = useNavigate();

  // Sync profile info whenever user changes
  useEffect(() => {
    if (user) {
      setUserInfo([
        { title: 'Full Name', value: user.fullname || 'NULL' },
        { title: 'Email', value: user.email || 'NULL' },
      ]);
    }
  }, [user]);

  // Fetch degree credits (wrapped in util)
  const handleTimelineClick = async (obj) => {
    if (!obj) return;

    localStorage.setItem('Timeline_Name', JSON.stringify(obj.name));

    const degreeId = obj.degree_id;
    const items = obj.items || [];

    // use modular utils
    let creditsRequired = await getDegreeCredits(degreeId);
    if (!creditsRequired) {
      console.error('Failed to fetch degree credits');
      creditsRequired = 120;
    }

    const transcriptData = buildTranscriptData(items);
    const isExtendedCredit = obj.isExtendedCredit;

    onDataProcessed({
      transcriptData,
      degreeId,
      creditsRequired,
      isExtendedCredit,
    });

    navigate('/timeline_change');
  };

  // Fetch user timelines using utils
  useEffect(() => {
    if (user?.type === 'student') {
      getUserTimelines(user._id)
        .then(setUserTimelines)
        .catch((err) => console.error('Error fetching user timelines:', err));
    }
  }, [user]);

  // Delete timeline handler using utils
  const handleDeleteClick = (timeline) => {
    setTimelineToDelete(timeline);
    setShowModal(true);
  };

  const handleDelete = async (timeline_id) => {
    try {
      await deleteTimelineById(timeline_id);
      setUserTimelines((prev) => prev.filter((obj) => obj.id !== timeline_id));
    } catch (e) {
      console.error('Error deleting timeline:', e);
    }
  };

  // Redirect to login if no user
  useEffect(() => {
    if (!user) navigate('/signin');
  }, [user, navigate]);

  if (!user) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }}>
      <div className="container-fluid">
        <div className="row vh-100">
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
                        <tr>
                          <td className="px-3 py-2 text-gray-500 font-semibold">Full Name</td>
                          <td className="px-3 py-2">{user.fullname || 'NULL'}</td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-gray-500 font-semibold">Email</td>
                          <td className="px-3 py-2">{user.email || 'NULL'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="separator-line"></div>
            </div>
          </div>

          {/* Right Side - My Timelines (Unchanged) */}
          <div className="col-12 col-md-6 d-flex flex-column text-center mx-auto mt-3 mt-md-0">
            <h2 className="mb-5">My Timelines</h2>
            {userTimelines.length === 0 ? (
              <Link to="/timeline_initial">
                <p>You haven't saved any timelines yet, click here to start now!</p>
              </Link>
            ) : (
              <div className="list-group">
                {userTimelines.map((obj) => (
                  <div key={obj.id} className="timeline-box d-flex align-items-center justify-content-between">
                    <span className="timeline-link" onClick={() => handleTimelineClick(obj)} aria-hidden="true">
                      <span className="timeline-text">{obj.name}</span>
                      <span className="timeline-text">
                        Last Modified: {moment(obj.last_modified).format('MMM DD, YYYY h:mm A')}
                      </span>
                    </span>
                    <button
                      onClick={() => handleDeleteClick(obj)}
                      className="timeline-delete btn btn-lg p-0 border-0 bg-transparent"
                    >
                      <TrashLogo size={25} className="me-1 text-danger" />
                    </button>
                  </div>
                ))}
                <Link to="/timeline_initial" className="timeline-add">
                  <span className="timeline-text">+</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Delete Modal */}
        <DeleteModal open={showModal} onClose={() => setShowModal(false)}>
          <div className="tw-text-center tw-w-56">
            <TrashLogo size={56} className="tw-mx-auto tw-text-red-500" />
            <div className="tw-mx-auto tw-my-4 tw-w-48">
              <h3 className="tw-text-lg tw-font-black tw-text-gray-800">Confirm Delete</h3>
              <p className="tw-text-sm tw-text-gray-500">Are you sure you want to delete "{timelineToDelete?.name}"?</p>
            </div>
            <div className="tw-flex tw-gap-4">
              <button
                className="btn btn-danger tw-w-full"
                onClick={() => {
                  handleDelete(timelineToDelete?.id);
                  setShowModal(false);
                }}
              >
                Delete
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
